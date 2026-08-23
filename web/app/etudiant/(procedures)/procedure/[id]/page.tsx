// app/etudiant/procedure/[id]/page.tsx
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
  Trash2,
  MessageSquare,
  Send,
  User as UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';

// ===== HOOKS =====
import {
  useProcedure,
  useCancelProcedure,
  useProcedureRealtime,
  useAddProcedureComment,
  useDeleteProcedureComment,
} from '@/src/hooks/use-procedure';
import { useDestinations } from '@/src/hooks/use-destinations';
import { useMyRendezVous } from '@/src/hooks/use-rendez-vous';
import { useConsultantsSemiPublic } from '@/src/hooks/use-users';
import { useCurrentUser } from '@/src/hooks/use-auth';

// ===== COMPOSANTS =====
import {
  LoadingState,
  EmptyState,
  StatusBadge,
  Modal,
} from '@/src/components/common';

// ===== TYPES =====
import { ProcedureStatus, StepStatus, TIME_SLOT_LABELS } from '@/src/types/enums';
import type { StepResponse, CommentResponse } from '@/src/types/procedure';
import type { RendezVousResponse } from '@/src/types/rendez-vous';

// ===== HELPERS =====
import { formatFrenchDate, formatDateTime } from '@/src/lib/date-helpers';



export default function EtudiantProcedureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // ===== REALTIME =====
  useProcedureRealtime();

  // ===== STATE =====
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [commentContent, setCommentContent] = useState('');

  // ===== DATA =====
  const { data: procedure, isLoading, refetch } = useProcedure(id);
  const { data: destinations } = useDestinations();
  const { data: rendezVous } = useMyRendezVous();
  const { data: consultants } = useConsultantsSemiPublic();
  const user = useCurrentUser();

  // ===== MUTATIONS =====
  const cancelMutation = useCancelProcedure();
  const addCommentMutation = useAddProcedureComment(id);
  const deleteCommentMutation = useDeleteProcedureComment(id);

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

  // ===== PROGRESS =====
  const progress = useMemo(() => {
    const steps = procedure?.steps || [];
    if (steps.length === 0) return 0;
    const completed = steps.filter((s) => s.status === StepStatus.COMPLETED).length;
    return Math.round((completed / steps.length) * 100);
  }, [procedure?.steps]);

  // ===== HANDLERS =====
  const handleCancel = () => {
    setShowCancelModal(true);
    setCancelReason('');
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Veuillez indiquer un motif d\'annulation');
      return;
    }
    await cancelMutation.mutateAsync({ id, reason: cancelReason });
    setShowCancelModal(false);
    refetch();
  };

  const handleAddComment = async () => {
    if (!commentContent.trim()) {
      toast.error('Veuillez saisir un commentaire');
      return;
    }

    try {
      await addCommentMutation.mutateAsync({ content: commentContent });
      setCommentContent('');
      refetch();
      toast.success('Commentaire ajoute avec succes');
    } catch {
      // Error handled by hook
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce commentaire ?')) return;

    try {
      await deleteCommentMutation.mutateAsync(commentId);
      refetch();
      toast.success('Commentaire supprime avec succes');
    } catch {
      // Error handled by hook
    }
  };

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
                onClick={() => router.push('/etudiant/procedures')}
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
  const steps = procedure.steps || [];
  const comments = procedure.comments || [];

  // ===== RENDER =====
  return (
    <section className="w-full bg-white py-8 sm:py-12 min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <button
          type="button"
          onClick={() => router.push('/etudiant/procedures')}
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
                  {consultantName}
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
                        isCompleted ? 'bg-emerald-500' : isRejected || isCancelled ? 'bg-red-500' : 'bg-sky-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-900">{progress}%</span>
                </div>
              </div>

              {isInProgress && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition-colors border border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Annuler la procedure</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {isRejected && procedure.cancellationReason && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Motif du rejet
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
                  {formatFrenchDate(rvInfo.date)} a {TIME_SLOT_LABELS[rvInfo.time as keyof typeof TIME_SLOT_LABELS]}
                </span>
              </div>
              <div>
                <span className="text-sky-600">Candidat :</span>
                <span className="ml-2 text-slate-700 font-medium">
                  {rvInfo.studentName}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-sky-600" />
              Etapes de la procedure
              <span className="text-sm font-normal text-slate-500 ml-2">
                ({steps.length} etapes)
              </span>
            </h2>
          </div>

          {steps.length > 0 ? (
            <div className="space-y-3">
              {steps.map((step: StepResponse, index: number) => {
                const isExpanded = expandedSteps.has(step.id);
                const isLast = index === steps.length - 1;

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

        {/* ============================================================ */}
        {/* COMMENTAIRES - Section complète avec ajout et suppression */}
        {/* ============================================================ */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-sky-600" />
              Commentaires
              <span className="text-sm font-normal text-slate-500 ml-2">
                ({comments.length})
              </span>
            </h2>
          </div>

          {/* Formulaire d'ajout de commentaire - visible si procédure en cours */}
          {isInProgress && (
            <div className="mb-4 p-4 bg-white border border-slate-200 rounded-xl">
              <div className="flex gap-3">
                <div className="flex-1">
                  <textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="Ajouter un commentaire sur cette procedure..."
                    rows={2}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 focus:bg-white transition-all resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Appuyez sur <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono border border-slate-200">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono border border-slate-200">Entree</kbd> pour envoyer
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={addCommentMutation.isPending || !commentContent.trim()}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2 self-end"
                >
                  {addCommentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Envoyer</span>
                </button>
              </div>
            </div>
          )}

          {/* Liste des commentaires */}
          {comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment: CommentResponse) => {
                const isStudent = comment.authorId === procedure.studentId;
                const isConsultant = comment.authorId === procedure.consultantId;
                const isCurrentUser = user?.id === comment.authorId;

                return (
                  <div
                    key={comment.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isStudent
                        ? 'bg-sky-50/50 border-sky-200'
                        : isConsultant
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isStudent
                          ? 'bg-sky-100 text-sky-700'
                          : isConsultant
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isStudent ? 'E' : isConsultant ? 'C' : 'A'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">
                              {isStudent ? 'Vous' : isConsultant ? consultantName : 'Administrateur'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatDateTime(comment.createdAt)}
                            </span>
                            {comment.updatedAt !== comment.createdAt && (
                              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                modifie
                              </span>
                            )}
                          </div>

                          {/* Bouton de suppression - visible si l'utilisateur est l'auteur ET si la procédure est en cours */}
                          {isCurrentUser && isInProgress && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment.id)}
                              disabled={deleteCommentMutation.isPending}
                              className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                              title="Supprimer le commentaire"
                            >
                              {deleteCommentMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap wrap-break-word">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Aucun commentaire pour cette procedure.</p>
              {isInProgress && (
                <p className="text-xs text-slate-400 mt-1">
                  Soyez le premier a laisser un commentaire
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODALE D'ANNULATION */}
      {/* ============================================================ */}
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
                onClick={handleConfirmCancel}
                disabled={cancelMutation.isPending || !cancelReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
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
              <span className="font-semibold text-slate-500">Consultant :</span> {consultantName}
            </p>
            <p>
              <span className="font-semibold text-slate-500">Progression :</span> {progress}%
            </p>
            <p>
              <span className="font-semibold text-slate-500">Commentaires :</span> {comments.length}
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
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500 resize-none"
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Cette action est irréversible. Toutes les etapes non validees seront annulees
              et les rendez-vous de suivi seront supprimes.
            </p>
          </div>
        </Modal>
      )}
    </section>
  );
}