// app/(gestionnaire)/consultant/rendez-vous/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  GraduationCap,
  Briefcase,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  CalendarDays,
  FileCheck2,
  ThumbsUp,
  ThumbsDown,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

// Hooks
import {
  useRendezVous,
  useCompleteRendezVous,
  useCancelRendezVous,
  useRescheduleRendezVous,
} from '@/src/hooks/use-rendez-vous';
import { rendezVousService } from '@/src/services/rendez-vous.service';
import { extractErrorMessage } from '@/src/lib/api-client';
import { useDestinations } from '@/src/hooks/use-destinations';
import { useConsultantsSemiPublic } from '@/src/hooks/use-users';

// Composants partagés
import {
  LoadingState,
  EmptyState,
  StatusBadge,
  OpinionBadge,
  ConfirmationModal,
  RescheduleModal,
  Modal,
} from '@/src/components/common';

// Types
import {
  RendezvousStatus,
  Opinion,
  TimeSlot,
  TIME_SLOT_LABELS,
} from '@/src/types/enums';
import type { RendezVousResponse } from '@/src/types/rendez-vous';

// Helpers
import { formatFrenchDate, formatShortDate } from '@/src/lib/date-helpers';

export default function ConsultantRendezVousDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // Queries
  const { data: rendezVous, isLoading, refetch } = useRendezVous(id);
  const { data: destinations = [] } = useDestinations();
  const { data: consultants = [] } = useConsultantsSemiPublic();

  // Mutations
  const completeMutation = useCompleteRendezVous();
  const cancelMutation = useCancelRendezVous(id);
  const rescheduleMutation = useRescheduleRendezVous(id);

  // State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showOpinionModal, setShowOpinionModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [opinionChoice, setOpinionChoice] = useState<Opinion>(Opinion.FAVORABLE);
  const [opinionNotes, setOpinionNotes] = useState('');

  // Helpers
  const getDestinationName = (destId?: string) => {
    if (!destId) return 'Destination internationale';
    const found = destinations.find((d: { id: string }) => d.id === destId);
    return found ? found.country : destId;
  };

  const getConsultantName = (cId?: string) => {
    if (!cId) return 'Consultant assigné';
    const found = consultants.find((c: { id: string }) => c.id === cId);
    return found ? `${found.firstName} ${found.lastName}` : 'Consultant assigné';
  };

  const isActionable = (status: RendezvousStatus) => {
    return status === RendezvousStatus.CONFIRMED;
  };

  // Actions
  const handleComplete = async () => {
    if (!rendezVous) return;
    try {
      await completeMutation.mutateAsync(rendezVous.id);
      toast.success('Rendez-vous marqué comme terminé');
      refetch();
      // Ouvrir le modal d'avis
      setOpinionChoice(rendezVous.opinion || Opinion.FAVORABLE);
      setOpinionNotes((rendezVous as any).opinionNotes || (rendezVous as any).notes || '');
      setShowOpinionModal(true);
    } catch {
      // Error handled by hook
    }
  };

  const handleCancel = () => {
    setShowCancelModal(true);
    setCancelReason('');
  };

  const handleConfirmCancel = async () => {
    if (!rendezVous) return;
    await cancelMutation.mutateAsync({ reason: cancelReason || undefined });
    setShowCancelModal(false);
    refetch();
  };

  const handleReschedule = () => {
    setShowRescheduleModal(true);
  };

  const handleConfirmReschedule = async (date: string, time: TimeSlot) => {
    if (!rendezVous) return;
    await rescheduleMutation.mutateAsync({ date, time });
    setShowRescheduleModal(false);
    refetch();
  };

  const handleSaveOpinion = async () => {
    if (!rendezVous) return;
    try {
      await rendezVousService.setOpinion(rendezVous.id, { opinion: opinionChoice });
      toast.success('Avis enregistré');
      setShowOpinionModal(false);
      refetch();
    } catch (error) {
      toast.error(extractErrorMessage(error).message);
    }
  };

  if (isLoading) {
    return (
      <section className="w-full bg-white py-8 sm:py-12 min-h-screen">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <LoadingState message="Chargement du rendez-vous..." />
        </div>
      </section>
    );
  }

  if (!rendezVous) {
    return (
      <section className="w-full bg-white py-8 sm:py-12 min-h-screen">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <EmptyState
            title="Rendez-vous introuvable"
            description="Le rendez-vous que vous recherchez n'existe pas ou a été supprimé."
            icon={<Calendar className="w-7 h-7" />}
            action={
              <button
                type="button"
                onClick={() => router.push('/consultant/rendez-vous')}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à la liste
              </button>
            }
          />
        </div>
      </section>
    );
  }

  const isCancelled = rendezVous.status === RendezvousStatus.CANCELLED;
  const isCompleted = rendezVous.status === RendezvousStatus.COMPLETED;
  const isConfirmed = rendezVous.status === RendezvousStatus.CONFIRMED;

  return (
    <section className="w-full bg-white py-8 sm:py-12 min-h-screen">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <button
          type="button"
          onClick={() => router.push('/consultant/rendez-vous')}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à mes rendez-vous
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  Détail du rendez-vous
                </h1>
                <StatusBadge status={rendezVous.status} type="rendezvous" />
                <OpinionBadge opinion={rendezVous.opinion} />
              </div>
              <p className="text-sm text-slate-500">
                {formatFrenchDate(rendezVous.date)} à {TIME_SLOT_LABELS[rendezVous.time]}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isActionable(rendezVous.status) && !isCancelled && (
                <>
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={completeMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {completeMutation.isPending ? 'Validation...' : 'Marquer Réalisé'}
                  </button>
                  <button
                    type="button"
                    onClick={handleReschedule}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    <CalendarDays className="w-4 h-4" />
                    Replanifier
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Annuler
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              Informations du candidat
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Nom complet</p>
                  <p className="font-medium text-slate-900">
                    {rendezVous.firstName} {rendezVous.lastName}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="font-medium text-slate-900">{rendezVous.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Téléphone</p>
                  <p className="font-medium text-slate-900">{rendezVous.phone}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              Informations académiques
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <GraduationCap className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Niveau d'études</p>
                  <p className="font-medium text-slate-900">{rendezVous.studyLevel}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Briefcase className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Secteur / Filière</p>
                  <p className="font-medium text-slate-900">{rendezVous.sector}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rendez-vous details */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 mb-8">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
            Détails du rendez-vous
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400">Destination</p>
                <p className="font-medium text-slate-900">
                  {getDestinationName(rendezVous.destinationId)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400">Consultant</p>
                <p className="font-medium text-slate-900">
                  {getConsultantName(rendezVous.consultantId)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400">Date</p>
                <p className="font-medium text-slate-900">
                  {formatFrenchDate(rendezVous.date)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400">Horaire</p>
                <p className="font-medium text-slate-900">
                  {TIME_SLOT_LABELS[rendezVous.time]}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-400">Référence</p>
            <p className="font-mono text-sm text-slate-900">
              #{rendezVous.id.slice(0, 8)}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-400">Créé le</p>
            <p className="text-sm text-slate-900">
              {formatShortDate(rendezVous.createdAt)}
            </p>
          </div>
        </div>

        {/* Cancellation reason */}
        {isCancelled && rendezVous.cancellationReason && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Motif d'annulation
            </p>
            <p className="text-sm text-red-600 mt-1">{rendezVous.cancellationReason}</p>
          </div>
        )}

        {/* Opinion */}
        {rendezVous.opinion && isCompleted && (
          <div className="mt-6 p-4 bg-sky-50 border border-sky-200 rounded-xl">
            <p className="text-sm font-semibold text-sky-700 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4" />
              Avis du consultant
            </p>
            <p className="text-sm text-sky-600 mt-1 font-medium">{rendezVous.opinion}</p>
            {(rendezVous as any).opinionNotes && (
              <p className="text-xs text-sky-600 mt-2 italic">
                &laquo; {(rendezVous as any).opinionNotes} &raquo;
              </p>
            )}
          </div>
        )}

        {/* Modals */}

        {/* Cancel Modal */}
        {showCancelModal && (
          <ConfirmationModal
            isOpen={true}
            onClose={() => setShowCancelModal(false)}
            onConfirm={handleConfirmCancel}
            title="Annuler le rendez-vous"
            subtitle={`${rendezVous.firstName} ${rendezVous.lastName} — ${getDestinationName(rendezVous.destinationId)}`}
            variant="danger"
            isPending={cancelMutation.isPending}
            confirmLabel={cancelMutation.isPending ? 'Annulation...' : "Confirmer l'annulation"}
            details={[
              { label: 'Date', value: formatFrenchDate(rendezVous.date) },
              { label: 'Horaire', value: TIME_SLOT_LABELS[rendezVous.time] },
              { label: 'Destination', value: getDestinationName(rendezVous.destinationId) },
            ]}
            warningMessage="Cette action est irréversible. Le créneau sera libéré et le candidat sera notifié."
          />
        )}

        {/* Reschedule Modal */}
        {showRescheduleModal && (
          <RescheduleModal
            isOpen={true}
            onClose={() => setShowRescheduleModal(false)}
            onConfirm={handleConfirmReschedule}
            currentDate={rendezVous.date}
            currentTime={rendezVous.time}
            itemLabel={`${rendezVous.firstName} ${rendezVous.lastName}`}
            variant="consultant"
            isPending={rescheduleMutation.isPending}
            additionalInfo={[
              { label: 'Destination', value: getDestinationName(rendezVous.destinationId) },
              { label: 'Filière', value: rendezVous.sector },
            ]}
          />
        )}

        {/* Opinion Modal */}
        {showOpinionModal && (
          <Modal
            isOpen={true}
            onClose={() => setShowOpinionModal(false)}
            title="Avis d'Orientation Académique"
            subtitle={`${rendezVous.firstName} ${rendezVous.lastName}`}
            maxWidth="lg"
            footer={
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOpinionModal(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveOpinion}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enregistrer l'Avis</span>
                </button>
              </div>
            }
          >
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-semibold text-slate-900">
                Candidat : {rendezVous.firstName} {rendezVous.lastName}
              </div>
              <div className="text-slate-500">
                Filière : {rendezVous.sector} ({rendezVous.studyLevel}) • Destination :{' '}
                {getDestinationName(rendezVous.destinationId)}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Décision d'Orientation
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setOpinionChoice(Opinion.FAVORABLE)}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    opinionChoice === Opinion.FAVORABLE
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs">Favorable</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOpinionChoice(Opinion.PENDING)}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    opinionChoice === Opinion.PENDING
                      ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="text-xs">À Compléter</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOpinionChoice(Opinion.UNFAVORABLE)}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    opinionChoice === Opinion.UNFAVORABLE
                      ? 'bg-red-50 border-red-500 text-red-900 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4 text-red-600" />
                  <span className="text-xs">Défavorable</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="opinion-notes-textarea" className="block text-xs font-bold text-slate-700">
                Préconisations & Notes Détaillées
              </label>
              <textarea
                id="opinion-notes-textarea"
                rows={4}
                value={opinionNotes}
                onChange={(e) => setOpinionNotes(e.target.value)}
                placeholder="Ex: Dossier recevable. Prérequis linguistique validé (IELTS 7.0). Universités cibles recommandées : McGill et Concordia."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-0 focus:border-sky-600 focus:bg-white transition-colors resize-none"
              />
            </div>
          </Modal>
        )}
      </div>
    </section>
  );
}