// app/(gestionnaire)/consultant/procedure/[id]/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  MapPin,
  User,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileCheck2,
  CalendarDays,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

// ===== HOOKS =====
import {
  useProcedure,
  useUpdateStep,
  useCompleteProcedure,
  useRejectProcedure,
  useCancelProcedure,
} from '@/src/hooks/use-procedure';
import { useDestinations } from '@/src/hooks/use-destinations';
import { useMyRendezVous } from '@/src/hooks/use-rendez-vous';
import { useConsultantsSemiPublic } from '@/src/hooks/use-users';

// ===== COMPOSANTS =====
import {
  LoadingState,
  EmptyState,
  StatusBadge,
  ConfirmationModal,
  Modal,
} from '@/src/components/common';

// ===== TYPES =====
import { ProcedureStatus, StepStatus, TIME_SLOT_LABELS, TimeSlot } from '@/src/types/enums';
import type { ProcedureResponse, StepResponse } from '@/src/types/procedure';
import type { RendezVousResponse } from '@/src/types/rendez-vous';

// ===== HELPERS =====
import { formatFrenchDate, formatShortDate, formatDateTime } from '@/src/lib/date-helpers';

export default function ConsultantProcedureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // ===== STATE =====
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // ===== MODAL STATE =====
  const [showUpdateStepModal, setShowUpdateStepModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedStep, setSelectedStep] = useState<StepResponse | null>(null);
  const [stepStatus, setStepStatus] = useState<StepStatus>(StepStatus.PENDING);
  const [stepRejectionReason, setStepRejectionReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  // ===== DATA =====
  const { data: procedure, isLoading, refetch } = useProcedure(id);
  const { data: destinations } = useDestinations();
  const { data: rendezVous } = useMyRendezVous();
  const { data: consultants } = useConsultantsSemiPublic();

  // Les steps sont inclus dans la réponse de useProcedure
  const steps = procedure?.steps || [];

  // ===== MUTATIONS =====
  const updateStepMutation = useUpdateStep(id);
  const completeMutation = useCompleteProcedure();
  const rejectMutation = useRejectProcedure();
  const cancelMutation = useCancelProcedure();

  // ===== HELPERS =====
  const getDestinationName = (id: string) => {
    const dest = destinations?.find((d: any) => d.id === id);
    return dest?.country || 'Non specifiee';
  };

  const getConsultantName = (id: string) => {
    const consultant = consultants?.find((c: any) => c.id === id);
    return consultant ? `${consultant.firstName} ${consultant.lastName}` : 'Consultant';
  };

  const getRendezVousInfo = (id: string) => {
    const rv = rendezVous?.find((r: RendezVousResponse) => r.id === id);
    if (!rv) return null;
    return {
      date: rv.date,
      time: rv.time,
      studentName: `${rv.firstName} ${rv.lastName}`,
      destinationId: rv.destinationId,
      consultantId: rv.consultantId,
    };
  };

  const getStepStatusLabel = (status: StepStatus) => {
    switch (status) {
      case StepStatus.PENDING: return 'En attente';
      case StepStatus.IN_PROGRESS: return 'En cours';
      case StepStatus.COMPLETED: return 'Validee';
      case StepStatus.REJECTED: return 'Rejetee';
      default: return status;
    }
  };

  const getStepStatusIcon = (status: StepStatus) => {
    switch (status) {
      case StepStatus.COMPLETED: return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case StepStatus.REJECTED: return <XCircle className="w-4 h-4 text-red-600" />;
      case StepStatus.IN_PROGRESS: return <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-amber-600" />;
    }
  };

  const getStepStatusColor = (status: StepStatus) => {
    switch (status) {
      case StepStatus.PENDING: return 'border-amber-200 bg-amber-50/50';
      case StepStatus.IN_PROGRESS: return 'border-sky-200 bg-sky-50/50';
      case StepStatus.COMPLETED: return 'border-emerald-200 bg-emerald-50/50';
      case StepStatus.REJECTED: return 'border-red-200 bg-red-50/50';
      default: return 'border-slate-200 bg-slate-50/50';
    }
  };

  const getStepStatusTextColor = (status: StepStatus) => {
    switch (status) {
      case StepStatus.PENDING: return 'text-amber-700';
      case StepStatus.IN_PROGRESS: return 'text-sky-700';
      case StepStatus.COMPLETED: return 'text-emerald-700';
      case StepStatus.REJECTED: return 'text-red-700';
      default: return 'text-slate-600';
    }
  };

  const canModifyStep = (step: StepResponse) => {
    return step.status === StepStatus.PENDING || step.status === StepStatus.IN_PROGRESS;
  };

  const canComplete = () => {
    if (!procedure || procedure.status !== ProcedureStatus.IN_PROGRESS) return false;
    if (!steps || steps.length === 0) return false;
    return steps.every((s) => s.status === StepStatus.COMPLETED);
  };

  const canReject = () => {
    return procedure?.status === ProcedureStatus.IN_PROGRESS;
  };

  const canCancel = () => {
    return procedure?.status === ProcedureStatus.IN_PROGRESS;
  };

  const toggleStepExpand = (stepId: string) => {
    setExpandedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  // ===== HANDLERS =====
  const handleUpdateStep = (step: StepResponse) => {
    setSelectedStep(step);
    setStepStatus(step.status);
    setStepRejectionReason(step.rejectionReason || '');
    setShowUpdateStepModal(true);
  };

  const handleConfirmUpdateStep = async () => {
    if (!selectedStep) return;
    await updateStepMutation.mutateAsync({
      stepId: selectedStep.id,
      payload: {
        status: stepStatus,
        rejectionReason: stepStatus === StepStatus.REJECTED ? stepRejectionReason : undefined,
      },
    });
    setShowUpdateStepModal(false);
    setSelectedStep(null);
    refetch();
  };

  const handleComplete = async () => {
    await completeMutation.mutateAsync(id);
    setShowCompleteModal(false);
    refetch();
  };

  const handleReject = async () => {
    await rejectMutation.mutateAsync({ id, reason: rejectReason });
    setShowRejectModal(false);
    refetch();
  };

  const handleCancel = async () => {
    await cancelMutation.mutateAsync({ id, reason: cancelReason });
    setShowCancelModal(false);
    refetch();
  };

  // ===== PROGRESS =====
  const progress = useMemo(() => {
    if (!steps || steps.length === 0) return 0;
    const completed = steps.filter((s) => s.status === StepStatus.COMPLETED).length;
    return Math.round((completed / steps.length) * 100);
  }, [steps]);

  // ===== LOADING =====
  if (isLoading) {
    return (
      <section className="w-full bg-white py-8 sm:py-12 min-h-screen">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <LoadingState message="Chargement de la procedure..." />
        </div>
      </section>
    );
  }

  // ===== NOT FOUND =====
  if (!procedure) {
    return (
      <section className="w-full bg-white py-8 sm:py-12 min-h-screen">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <EmptyState
            title="Procedure introuvable"
            description="La procedure que vous recherchez n'existe pas ou a ete supprimee."
            icon={<FileText className="w-7 h-7" />}
            action={
              <button
                type="button"
                onClick={() => router.push('/consultant/procedures')}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour aux procedures
              </button>
            }
          />
        </div>
      </section>
    );
  }

  const rvInfo = getRendezVousInfo(procedure.rendezVousId);
  const destinationName = getDestinationName(procedure.destinationId);
  const consultantName = getConsultantName(procedure.consultantId);
  const isCompleted = procedure.status === ProcedureStatus.COMPLETED;
  const isRejected = procedure.status === ProcedureStatus.REJECTED;
  const isCancelled = procedure.status === ProcedureStatus.CANCELLED;
  const isInProgress = procedure.status === ProcedureStatus.IN_PROGRESS;
  const isCompletable = canComplete();

  // ===== RENDER =====
  return (
    <section className="w-full bg-white py-8 sm:py-12 min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <button
          type="button"
          onClick={() => router.push('/consultant/procedures')}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux procedures
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1">
                  <Briefcase className="w-3.5 h-3.5 text-sky-600" />
                  <span className="text-xs font-medium text-sky-700">Consultant</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 font-mono">
                  {procedure.numeroDossier}
                </h1>
                <StatusBadge status={procedure.status} type="procedure" />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {destinationName}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" />
                  Etudiant: #{procedure.studentId?.slice(0, 8) || 'N/A'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {formatFrenchDate(procedure.createdAt)}
                </span>
              </div>
            </div>

            {/* Progress & Actions */}
            <div className="flex flex-col items-end gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 min-w-30">
                <p className="text-xs text-slate-500">Progression</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isCompleted ? 'bg-emerald-500' : isRejected ? 'bg-red-500' : 'bg-sky-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-900">{progress}%</span>
                </div>
              </div>

              {isInProgress && (
                <div className="flex items-center gap-2">
                  {isCompletable && (
                    <button
                      type="button"
                      onClick={() => setShowCompleteModal(true)}
                      disabled={completeMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Terminer la procedure</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg transition-colors border border-red-200"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Rejeter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Annuler</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {isRejected && procedure.cancellationReason && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Motif de rejet
            </p>
            <p className="text-sm text-red-600 mt-1">{procedure.cancellationReason}</p>
          </div>
        )}

        {isCancelled && procedure.cancellationReason && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-semibold text-amber-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Motif d'annulation
            </p>
            <p className="text-sm text-amber-600 mt-1">{procedure.cancellationReason}</p>
          </div>
        )}

        {/* Rendez-vous info */}
        {rvInfo && (
          <div className="mb-6 p-4 bg-sky-50 border border-sky-200 rounded-xl">
            <p className="text-sm font-semibold text-sky-700 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Rendez-vous associe
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-sm">
              <div>
                <span className="text-sky-600">Date :</span>
                <span className="ml-2 text-slate-700 font-medium">
                  {formatFrenchDate(rvInfo.date)} a {TIME_SLOT_LABELS[rvInfo.time as TimeSlot]}
                </span>
              </div>
              <div>
                <span className="text-sky-600">Etudiant :</span>
                <span className="ml-2 text-slate-700 font-medium">
                  {rvInfo.studentName}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-sky-600" />
            Etapes de la procedure
            <span className="text-sm font-normal text-slate-500 ml-2">
              ({steps?.length || 0} etapes)
            </span>
          </h2>

          {steps && steps.length > 0 ? (
            <div className="space-y-3">
              {steps.map((step: StepResponse, index: number) => {
                const isExpanded = expandedSteps.has(step.id);
                const isLast = index === steps.length - 1;
                const canModify = isInProgress && canModifyStep(step);

                return (
                  <div key={step.id} className="relative">
                    {/* Ligne de connexion */}
                    {!isLast && (
                      <div
                        className={`absolute left-5 top-10 w-0.5 h-8 ${
                          step.status === StepStatus.COMPLETED
                            ? 'bg-emerald-400'
                            : step.status === StepStatus.REJECTED
                            ? 'bg-red-400'
                            : 'bg-slate-300'
                        }`}
                      />
                    )}

                    <div
                      className={`border rounded-xl p-4 transition-all ${getStepStatusColor(
                        step.status
                      )} ${isExpanded ? 'shadow-sm' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Status icon */}
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                          {getStepStatusIcon(step.status)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <h3 className="text-sm font-semibold text-slate-900">
                                {step.stepName}
                              </h3>
                              <span
                                className={`text-xs font-medium ${getStepStatusTextColor(
                                  step.status
                                )}`}
                              >
                                {getStepStatusLabel(step.status)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {canModify && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStep(step)}
                                  disabled={updateStepMutation.isPending}
                                  className="px-2.5 py-1 text-[10px] font-medium bg-white border border-sky-200 text-sky-700 rounded-lg hover:bg-sky-50 transition-colors"
                                >
                                  Modifier
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleStepExpand(step.id)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/50 transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Details expandables */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2 text-xs">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <span className="text-slate-500">Statut :</span>
                                  <span className={`ml-2 font-medium ${getStepStatusTextColor(step.status)}`}>
                                    {getStepStatusLabel(step.status)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Ordre :</span>
                                  <span className="ml-2 font-medium text-slate-700">
                                    Etape {step.orderIndex + 1}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Cree le :</span>
                                  <span className="ml-2 font-medium text-slate-700">
                                    {formatDateTime(step.createdAt)}
                                  </span>
                                </div>
                                {step.updatedAt !== step.createdAt && (
                                  <div>
                                    <span className="text-slate-500">Mis a jour :</span>
                                    <span className="ml-2 font-medium text-slate-700">
                                      {formatDateTime(step.updatedAt)}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {step.rejectionReason && (
                                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
                                  <p className="font-semibold text-red-700 text-[11px]">Motif du rejet :</p>
                                  <p className="text-red-600 mt-0.5">{step.rejectionReason}</p>
                                </div>
                              )}

                              {step.cascadeCancelledFromStepId && (
                                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                                  <p className="font-semibold text-amber-700 text-[11px]">
                                    Annulee en cascade depuis l'etape precedente
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-sm text-slate-500">Aucune etape definie pour cette procedure.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}

      {/* Update Step Modal */}
      {showUpdateStepModal && selectedStep && (
        <Modal
          isOpen={true}
          onClose={() => { setShowUpdateStepModal(false); setSelectedStep(null); }}
          title="Modifier l'etape"
          subtitle={selectedStep.stepName}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowUpdateStepModal(false); setSelectedStep(null); }}
                className="px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold rounded-xl transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmUpdateStep}
                disabled={updateStepMutation.isPending || (stepStatus === StepStatus.REJECTED && !stepRejectionReason.trim())}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
              >
                {updateStepMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Statut de l'etape
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStepStatus(StepStatus.COMPLETED)}
                  className={`p-3 rounded-xl border text-center text-xs font-medium transition-all ${
                    stepStatus === StepStatus.COMPLETED
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  Valider
                </button>
                <button
                  type="button"
                  onClick={() => setStepStatus(StepStatus.IN_PROGRESS)}
                  className={`p-3 rounded-xl border text-center text-xs font-medium transition-all ${
                    stepStatus === StepStatus.IN_PROGRESS
                      ? 'bg-sky-50 border-sky-500 text-sky-700 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Clock className="w-4 h-4 mx-auto mb-1 text-sky-600" />
                  En cours
                </button>
                <button
                  type="button"
                  onClick={() => setStepStatus(StepStatus.REJECTED)}
                  className={`p-3 rounded-xl border text-center text-xs font-medium transition-all ${
                    stepStatus === StepStatus.REJECTED
                      ? 'bg-red-50 border-red-500 text-red-700 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <XCircle className="w-4 h-4 mx-auto mb-1 text-red-600" />
                  Rejeter
                </button>
              </div>
            </div>

            {stepStatus === StepStatus.REJECTED && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Motif du rejet <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={stepRejectionReason}
                  onChange={(e) => setStepRejectionReason(e.target.value)}
                  placeholder="Expliquez les raisons du rejet..."
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 resize-none"
                />
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setShowCompleteModal(false)}
          onConfirm={handleComplete}
          title="Terminer la procedure"
          subtitle={`Dossier #${procedure.numeroDossier}`}
          variant="success"
          isPending={completeMutation.isPending}
          confirmLabel={completeMutation.isPending ? 'Traitement...' : 'Confirmer la cloture'}
          details={[
            { label: 'Destination', value: destinationName },
            { label: 'Etapes validees', value: `${steps?.filter((s) => s.status === StepStatus.COMPLETED).length || 0}/${steps?.length || 0}` },
          ]}
          warningMessage="Cette action marquera la procedure comme terminee. Elle ne pourra plus etre modifiee."
        />
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowRejectModal(false)}
          title="Rejeter la procedure"
          subtitle={`Dossier #${procedure.numeroDossier}`}
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold rounded-xl transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
              >
                {rejectMutation.isPending ? 'Traitement...' : 'Confirmer le rejet'}
              </button>
            </div>
          }
        >
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <p>
              <span className="font-semibold text-slate-500">Destination :</span> {destinationName}
            </p>
            <p>
              <span className="font-semibold text-slate-500">Etapes validees :</span>{' '}
              {steps?.filter((s) => s.status === StepStatus.COMPLETED).length || 0}/
              {steps?.length || 0}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Motif du rejet <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Expliquez les raisons du rejet..."
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 resize-none"
            />
          </div>

          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Cette action est irréversible. L'etudiant sera notifie du rejet de son dossier.</p>
          </div>
        </Modal>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCancelModal(false)}
          title="Annuler la procedure"
          subtitle={`Dossier #${procedure.numeroDossier}`}
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold rounded-xl transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelMutation.isPending || !cancelReason.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
              >
                {cancelMutation.isPending ? 'Traitement...' : 'Confirmer l\'annulation'}
              </button>
            </div>
          }
        >
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <p>
              <span className="font-semibold text-slate-500">Destination :</span> {destinationName}
            </p>
            <p>
              <span className="font-semibold text-slate-500">Etapes validees :</span>{' '}
              {steps?.filter((s) => s.status === StepStatus.COMPLETED).length || 0}/
              {steps?.length || 0}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Motif d'annulation <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Expliquez les raisons de l'annulation..."
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 resize-none"
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Cette action est irréversible. L'etudiant sera notifie de l'annulation.</p>
          </div>
        </Modal>
      )}
    </section>
  );
}