// app/(gestionnaire)/consultant/consultation/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  MapPin,
  FileText,
  CalendarDays,
  XCircle,
  CalendarClock,
  CheckCircle2,
  Briefcase,
} from 'lucide-react';

// ===== HOOKS =====
import {
  useFollowUpMeeting,
  useCancelFollowUpMeeting,
  useRescheduleFollowUpMeeting,
  useCompleteFollowUpMeeting,
} from '@/src/hooks/use-follow-up-meeting';
import { useMyProceduresAsConsultant } from '@/src/hooks/use-procedure';
import { useMyRendezVous } from '@/src/hooks/use-rendez-vous';
import { useConsultantsSemiPublic } from '@/src/hooks/use-users';
import { useDestinations } from '@/src/hooks/use-destinations';

// ===== COMPOSANTS =====
import {
  LoadingState,
  EmptyState,
  StatusBadge,
  ConfirmationModal,
  RescheduleModal,
} from '@/src/components/common';

// ===== TYPES =====
import { MeetingStatus, TimeSlot, TIME_SLOT_LABELS } from '@/src/types/enums';
import type { ProcedureResponse } from '@/src/types/procedure';
import type { RendezVousResponse } from '@/src/types/rendez-vous';

// ===== HELPERS =====
import { formatFrenchDate, formatDateTime } from '@/src/lib/date-helpers';

export default function ConsultantConsultationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // ===== STATE =====
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // ===== DATA =====
  const { data: meeting, isLoading, refetch } = useFollowUpMeeting(id);
  const { data: procedures } = useMyProceduresAsConsultant();
  const { data: rendezVous } = useMyRendezVous();
  const { data: consultants } = useConsultantsSemiPublic();
  const { data: destinations } = useDestinations();

  // ===== MUTATIONS =====
  const cancelMutation = useCancelFollowUpMeeting(id);
  const rescheduleMutation = useRescheduleFollowUpMeeting(id);
  const completeMutation = useCompleteFollowUpMeeting();

  // ===== HELPERS =====
  const getProcedure = () => {
    if (!meeting) return null;
    return procedures?.find((p: ProcedureResponse) => p.id === meeting.procedureId) || null;
  };

  const getDestinationName = () => {
    const proc = getProcedure();
    if (!proc) return 'Non specifiee';
    const dest = destinations?.find((d: any) => d.id === proc.destinationId);
    return dest?.country || 'Non specifiee';
  };

  const getConsultantName = () => {
    if (!meeting) return 'Consultant';
    const consultant = consultants?.find((c: any) => c.id === meeting.consultantId);
    return consultant ? `${consultant.firstName} ${consultant.lastName}` : 'Consultant';
  };

  const getStudentName = () => {
    if (!meeting) return 'Etudiant';
    const rv = rendezVous?.find((r: RendezVousResponse) => r.id === meeting.studentId);
    if (rv) return `${rv.firstName} ${rv.lastName}`;
    return 'Etudiant';
  };

  const getProcedureNumber = () => {
    const proc = getProcedure();
    return proc?.numeroDossier || 'N/A';
  };

  const getStatusLabel = (status: MeetingStatus) => {
    switch (status) {
      case MeetingStatus.CONFIRMED: return 'Confirme';
      case MeetingStatus.PENDING: return 'En attente';
      case MeetingStatus.COMPLETED: return 'Effectue';
      case MeetingStatus.CANCELLED: return 'Annule';
      default: return status;
    }
  };

  const isActionable = (status: MeetingStatus) => {
    return status === MeetingStatus.CONFIRMED || status === MeetingStatus.PENDING;
  };

  const canComplete = (status: MeetingStatus) => {
    return status === MeetingStatus.CONFIRMED;
  };

  // ===== HANDLERS =====
  const handleCancel = () => setShowCancelModal(true);

  const handleConfirmCancel = async () => {
    await cancelMutation.mutateAsync({ reason: cancelReason || undefined });
    setShowCancelModal(false);
    refetch();
  };

  const handleReschedule = () => setShowRescheduleModal(true);

  const handleConfirmReschedule = async (date: string, time: TimeSlot) => {
    await rescheduleMutation.mutateAsync({ date, time });
    setShowRescheduleModal(false);
    refetch();
  };

  const handleComplete = () => setShowCompleteModal(true);

  const handleConfirmComplete = async () => {
    await completeMutation.mutateAsync(id);
    setShowCompleteModal(false);
    refetch();
  };

  // ===== LOADING =====
  if (isLoading) {
    return (
      <section className="w-full bg-white py-8 sm:py-12 min-h-screen">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <LoadingState message="Chargement de la consultation..." />
        </div>
      </section>
    );
  }

  // ===== NOT FOUND =====
  if (!meeting) {
    return (
      <section className="w-full bg-white py-8 sm:py-12 min-h-screen">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <EmptyState
            title="Consultation introuvable"
            description="La consultation que vous recherchez n'existe pas ou a ete supprimee."
            icon={<CalendarDays className="w-7 h-7" />}
            action={
              <button
                type="button"
                onClick={() => router.push('/consultant/mes-consultations')}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour aux consultations
              </button>
            }
          />
        </div>
      </section>
    );
  }

  const procedure = getProcedure();
  const destinationName = getDestinationName();
  const consultantName = getConsultantName();
  const studentName = getStudentName();
  const procedureNumber = getProcedureNumber();
  const isCancelled = meeting.status === MeetingStatus.CANCELLED;
  const isCompleted = meeting.status === MeetingStatus.COMPLETED;
  const isActionableStatus = isActionable(meeting.status);
  const isCompletable = canComplete(meeting.status);

  // ===== RENDER =====
  return (
    <section className="w-full bg-white py-8 sm:py-12 min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <button
          type="button"
          onClick={() => router.push('/consultant/mes-consultations')}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux consultations
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
                <h1 className="text-2xl font-bold text-slate-900">
                  Consultation de suivi
                </h1>
                <StatusBadge status={meeting.status} type="meeting" />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {formatFrenchDate(meeting.date)} a {TIME_SLOT_LABELS[meeting.time]}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-400" />
                  Dossier #{procedureNumber}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" />
                  {studentName}
                </span>
              </div>
            </div>

            {/* Actions */}
            {!isCancelled && !isCompleted && (
              <div className="flex items-center gap-2">
                {isCompletable && (
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={completeMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-2xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Marquer effectue</span>
                  </button>
                )}

                {isActionableStatus && (
                  <>
                    <button
                      type="button"
                      onClick={handleReschedule}
                      disabled={rescheduleMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-sm font-medium rounded-lg transition-colors"
                    >
                      <CalendarClock className="w-4 h-4" />
                      Replanifier
                    </button>

                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={cancelMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Annuler
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {isCancelled && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Consultation annulee
            </p>
          </div>
        )}

        {isCompleted && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Consultation effectuee
            </p>
          </div>
        )}

        {/* Main Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              Details du rendez-vous
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Date</p>
                  <p className="font-medium text-slate-900">{formatFrenchDate(meeting.date)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Heure</p>
                  <p className="font-medium text-slate-900">{TIME_SLOT_LABELS[meeting.time]}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <StatusBadge status={meeting.status} type="meeting" showIcon={false} />
                <div>
                  <p className="text-xs text-slate-400">Statut</p>
                  <p className="font-medium text-slate-900">{getStatusLabel(meeting.status)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Cree par</p>
                  <p className="font-medium text-slate-900">{meeting.createdBy}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Cree le</p>
                  <p className="font-medium text-slate-900">{formatDateTime(meeting.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              Informations du dossier
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Dossier</p>
                  <p className="font-medium text-slate-900 font-mono">#{procedureNumber}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Destination</p>
                  <p className="font-medium text-slate-900">{destinationName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Consultant</p>
                  <p className="font-medium text-slate-900">{consultantName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Etudiant</p>
                  <p className="font-medium text-slate-900">{studentName}</p>
                </div>
              </div>
              {procedure && (
                <div className="flex items-start gap-3">
                  <Briefcase className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400">Progression du dossier</p>
                    <p className="font-medium text-slate-900">
                      {procedure.steps?.filter((s) => s.status === 'COMPLETED').length || 0}/
                      {procedure.steps?.length || 0} etapes validees
                    </p>
                  </div>
                </div>
              )}
              {meeting.reason && (
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400">Motif</p>
                    <p className="font-medium text-slate-900 italic">{meeting.reason}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-400">Reference</p>
            <p className="font-mono text-sm text-slate-900">#{meeting.id.slice(0, 8)}</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-400">Mis a jour le</p>
            <p className="text-sm text-slate-900">
              {formatDateTime(meeting.updatedAt)}
            </p>
          </div>
        </div>

        {/* Modals */}

        {/* Cancel Modal */}
        {showCancelModal && (
          <ConfirmationModal
            isOpen={true}
            onClose={() => setShowCancelModal(false)}
            onConfirm={handleConfirmCancel}
            title="Annuler la consultation"
            subtitle={`Dossier #${procedureNumber} — ${studentName}`}
            variant="danger"
            isPending={cancelMutation.isPending}
            confirmLabel={cancelMutation.isPending ? 'Annulation...' : "Confirmer l'annulation"}
            details={[
              { label: 'Etudiant', value: studentName },
              { label: 'Date', value: formatFrenchDate(meeting.date) },
              { label: 'Horaire', value: TIME_SLOT_LABELS[meeting.time] },
            ]}
            warningMessage="Cette action est irréversible. Toutes les parties concernées seront notifiées."
          />
        )}

        {/* Reschedule Modal */}
        {showRescheduleModal && (
          <RescheduleModal
            isOpen={true}
            onClose={() => setShowRescheduleModal(false)}
            onConfirm={handleConfirmReschedule}
            currentDate={meeting.date}
            currentTime={meeting.time}
            itemLabel={`Dossier #${procedureNumber} — ${studentName}`}
            variant="consultant"
            isPending={rescheduleMutation.isPending}
            additionalInfo={[
              { label: 'Etudiant', value: studentName },
              { label: 'Destination', value: destinationName },
            ]}
          />
        )}

        {/* Complete Modal */}
        {showCompleteModal && (
          <ConfirmationModal
            isOpen={true}
            onClose={() => setShowCompleteModal(false)}
            onConfirm={handleConfirmComplete}
            title="Marquer la consultation comme effectuee"
            subtitle={`Dossier #${procedureNumber} — ${studentName}`}
            variant="success"
            isPending={completeMutation.isPending}
            confirmLabel={completeMutation.isPending ? 'Traitement...' : 'Confirmer'}
            details={[
              { label: 'Etudiant', value: studentName },
              { label: 'Date', value: formatFrenchDate(meeting.date) },
              { label: 'Horaire', value: TIME_SLOT_LABELS[meeting.time] },
            ]}
            warningMessage="Cette action confirme la realisation de la consultation. L'etudiant en sera informe."
          />
        )}
      </div>
    </section>
  );
}