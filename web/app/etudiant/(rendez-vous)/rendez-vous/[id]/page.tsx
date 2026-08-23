// app/etudiant/rendez-vous/[id]/page.tsx
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
  XCircle,
  CalendarDays,
  FileCheck2,
} from 'lucide-react';

import {
  useRendezVous,
  useCancelRendezVous,
  useRescheduleRendezVous,
} from '@/src/hooks/use-rendez-vous';
import { useDestinations } from '@/src/hooks/use-destinations';
import { useConsultantsSemiPublic } from '@/src/hooks/use-users';

import {
  LoadingState,
  EmptyState,
  StatusBadge,
  OpinionBadge,
  ConfirmationModal,
  RescheduleModal,
} from '@/src/components/common';
import { InfoCard, DetailRow, InfoPill } from '@/src/components/etudiant/rendez-vous';

import { TIME_SLOT_LABELS, RendezvousStatus, TimeSlot } from '@/src/types/enums';

import { formatFrenchDate, formatDateTime } from '@/src/lib/date-helpers';

export default function EtudiantRendezVousDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: rendezVous, isLoading, refetch } = useRendezVous(id);
  const { data: destinations } = useDestinations();
  const { data: consultants } = useConsultantsSemiPublic();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const cancelRendezVous = useCancelRendezVous(id);
  const rescheduleRendezVous = useRescheduleRendezVous(id);

  const getDestinationName = (destId?: string) => {
    if (!destId) return 'Non specifiee';
    const found = destinations?.find((d: any) => d.id === destId);
    return found?.country || 'Non specifiee';
  };

  const getConsultantName = (cId?: string) => {
    if (!cId) return 'Consultant';
    const found = consultants?.find((c: any) => c.id === cId);
    return found ? `${found.firstName} ${found.lastName}` : 'Consultant';
  };

  const isActionable = (status: RendezvousStatus) => {
    return status === RendezvousStatus.CONFIRMED || status === RendezvousStatus.PENDING;
  };

  const handleConfirmCancel = async () => {
    await cancelRendezVous.mutateAsync({ reason: cancelReason || undefined });
    setShowCancelModal(false);
    refetch();
  };

  const handleConfirmReschedule = async (date: string, time: TimeSlot) => {
    await rescheduleRendezVous.mutateAsync({ date, time });
    setShowRescheduleModal(false);
    refetch();
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
            description="Le rendez-vous que vous recherchez n'existe pas ou a ete supprime."
            icon={<Calendar className="w-7 h-7" />}
            action={
              <button
                type="button"
                onClick={() => router.push('/etudiant/mes-rendez-vous')}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour a mes rendez-vous
              </button>
            }
          />
        </div>
      </section>
    );
  }

  const isCancelled = rendezVous.status === RendezvousStatus.CANCELLED;
  const isCompleted = rendezVous.status === RendezvousStatus.COMPLETED;

  return (
    <section className="w-full bg-white py-8 sm:py-12 min-h-screen">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => router.push('/etudiant/mes-rendez-vous')}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour a mes rendez-vous
        </button>

        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-900">Detail du rendez-vous</h1>
                <StatusBadge status={rendezVous.status} type="rendezvous" />
                <OpinionBadge opinion={rendezVous.opinion} />
              </div>
              <p className="text-sm text-slate-500">
                {formatFrenchDate(rendezVous.date)} a {TIME_SLOT_LABELS[rendezVous.time]}
              </p>
            </div>

            {isActionable(rendezVous.status) && !isCancelled && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-sm font-medium rounded-lg transition-colors"
                >
                  <CalendarDays className="w-4 h-4" />
                  Replanifier
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <InfoCard
            title="Informations du candidat"
            items={[
              { icon: User, label: 'Nom complet', value: `${rendezVous.firstName} ${rendezVous.lastName}` },
              { icon: Mail, label: 'Email', value: rendezVous.email },
              { icon: Phone, label: 'Telephone', value: rendezVous.phone },
            ]}
          />
          <InfoCard
            title="Informations academiques"
            items={[
              { icon: GraduationCap, label: "Niveau d'etudes", value: rendezVous.studyLevel },
              { icon: Briefcase, label: 'Secteur / Filiere', value: rendezVous.sector },
            ]}
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 mb-8">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
            Details du rendez-vous
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailRow icon={MapPin} label="Destination" value={getDestinationName(rendezVous.destinationId)} />
            <DetailRow icon={User} label="Consultant" value={getConsultantName(rendezVous.consultantId)} />
            <DetailRow icon={Calendar} label="Date" value={formatFrenchDate(rendezVous.date)} />
            <DetailRow icon={Clock} label="Horaire" value={TIME_SLOT_LABELS[rendezVous.time]} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoPill label="Reference" value={`#${rendezVous.id.slice(0, 8)}`} />
          <InfoPill label="Cree le" value={formatDateTime(rendezVous.createdAt)} />
        </div>

        {isCancelled && rendezVous.cancellationReason && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Motif d'annulation
            </p>
            <p className="text-sm text-red-600 mt-1">{rendezVous.cancellationReason}</p>
          </div>
        )}

        {isCompleted && rendezVous.opinion && (
          <div className="mt-6 p-4 bg-sky-50 border border-sky-200 rounded-xl">
            <p className="text-sm font-semibold text-sky-700 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4" />
              Avis du consultant
            </p>
            <OpinionBadge opinion={rendezVous.opinion} className="mt-1" />
          </div>
        )}

        {showCancelModal && (
          <ConfirmationModal
            isOpen={true}
            onClose={() => setShowCancelModal(false)}
            onConfirm={handleConfirmCancel}
            title="Annuler le rendez-vous"
            subtitle={`${rendezVous.firstName} ${rendezVous.lastName} — ${getDestinationName(rendezVous.destinationId)}`}
            variant="danger"
            isPending={cancelRendezVous.isPending}
            confirmLabel={cancelRendezVous.isPending ? 'Annulation...' : "Confirmer l'annulation"}
            details={[
              { label: 'Date', value: formatFrenchDate(rendezVous.date) },
              { label: 'Horaire', value: TIME_SLOT_LABELS[rendezVous.time] },
              { label: 'Consultant', value: getConsultantName(rendezVous.consultantId) },
            ]}
            warningMessage="Cette action est irreversible. Toutes les parties concernees seront notifiees."
          />
        )}

        {showRescheduleModal && (
          <RescheduleModal
            isOpen={true}
            onClose={() => setShowRescheduleModal(false)}
            onConfirm={handleConfirmReschedule}
            currentDate={rendezVous.date}
            currentTime={rendezVous.time}
            itemLabel={`${rendezVous.firstName} ${rendezVous.lastName}`}
            variant="student"
            isPending={rescheduleRendezVous.isPending}
            additionalInfo={[
              { label: 'Destination', value: getDestinationName(rendezVous.destinationId) },
              { label: 'Consultant', value: getConsultantName(rendezVous.consultantId) },
            ]}
          />
        )}
      </div>
    </section>
  );
}
