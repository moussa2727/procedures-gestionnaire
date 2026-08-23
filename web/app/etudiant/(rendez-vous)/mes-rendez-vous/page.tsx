// app/etudiant/mes-rendez-vous/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, CalendarClock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import {
  useMyRendezVous,
  useCancelRendezVous,
  useRescheduleRendezVous,
  useRendezVousRealtime,
} from '@/src/hooks/use-rendez-vous';
import { useDestinations } from '@/src/hooks/use-destinations';
import { useConsultantsSemiPublic } from '@/src/hooks/use-users';

import {
  LoadingState,
  EmptyState,
  ConfirmationModal,
  RescheduleModal,
} from '@/src/components/common';
import { MesRendezVousCard, StatsGrid } from '@/src/components/etudiant/rendez-vous';

import { TIME_SLOT_LABELS, RendezvousStatus, TimeSlot } from '@/src/types/enums';
import type { RendezVousResponse } from '@/src/types/rendez-vous';
import type { ConsultantSemiPublicProfile } from '@/src/types/user';
import type { DestinationResponse } from '@/src/types/destination';

import { formatFrenchDate } from '@/src/lib/date-helpers';

type ActionType = 'cancel' | 'reschedule' | null;

export default function MesRendezVous() {
  const router = useRouter();

  const { data: rendezVous, isLoading, refetch } = useMyRendezVous();
  const { data: destinations } = useDestinations();
  const { data: consultants } = useConsultantsSemiPublic();

  useRendezVousRealtime();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<ActionType>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const cancelRendezVous = useCancelRendezVous(selectedId || '');
  const rescheduleRendezVous = useRescheduleRendezVous(selectedId || '');

  const getDestinationName = (id: string) => {
    const dest = destinations?.find((d: DestinationResponse) => d.id === id);
    return dest?.country || 'Non specifiee';
  };

  const getConsultantName = (id: string) => {
    const consultant = consultants?.find((c: ConsultantSemiPublicProfile) => c.id === id);
    return consultant ? `${consultant.firstName} ${consultant.lastName}` : 'Consultant';
  };

  const isActionable = (status: RendezvousStatus) => {
    return status === RendezvousStatus.CONFIRMED || status === RendezvousStatus.PENDING;
  };

  const getStatusStyle = (status: RendezvousStatus) => {
    const STATUS_CONFIG = {
      [RendezvousStatus.CONFIRMED]: { color: 'text-sky-600 bg-sky-50 border-sky-200', label: 'Confirme' },
      [RendezvousStatus.PENDING]: { color: 'text-amber-600 bg-amber-50 border-amber-200', label: 'En attente' },
      [RendezvousStatus.COMPLETED]: { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', label: 'Termine' },
      [RendezvousStatus.CANCELLED]: { color: 'text-red-600 bg-red-50 border-red-200', label: 'Annule' },
    };
    return STATUS_CONFIG[status] || STATUS_CONFIG[RendezvousStatus.PENDING];
  };

  const handleCancel = (id: string) => {
    setSelectedId(id);
    setAction('cancel');
    setCancelReason('');
  };

  const handleReschedule = (id: string) => {
    setSelectedId(id);
    setAction('reschedule');
  };

  const confirmCancel = () => {
    if (!selectedId) return;
    cancelRendezVous.mutate(
      { reason: cancelReason || undefined },
      {
        onSuccess: () => {
          toast.success('Rendez-vous annule avec succes');
          setAction(null);
          setSelectedId(null);
          refetch();
        },
        onError: (error) => {
          toast.error(error.message || "Erreur lors de l'annulation");
        },
      }
    );
  };

  const confirmReschedule = async (date: string, time: TimeSlot) => {
    if (!selectedId) return;
    await rescheduleRendezVous.mutateAsync({ date, time });
    setAction(null);
    setSelectedId(null);
    refetch();
  };

  const { active, past } = useMemo(() => {
    if (!rendezVous) return { active: [], past: [] };
    return {
      active: rendezVous.filter(
        (r: RendezVousResponse) => r.status === RendezvousStatus.CONFIRMED || r.status === RendezvousStatus.PENDING
      ),
      past: rendezVous.filter(
        (r: RendezVousResponse) => r.status === RendezvousStatus.COMPLETED || r.status === RendezvousStatus.CANCELLED
      ),
    };
  }, [rendezVous]);

  const stats = useMemo(() => ({
    total: rendezVous?.length || 0,
    active: active.length,
    pending: rendezVous?.filter((r: RendezVousResponse) => r.status === RendezvousStatus.PENDING).length || 0,
    past: past.length,
  }), [rendezVous, active, past]);

  const selectedRendezVous = rendezVous?.find((r: RendezVousResponse) => r.id === selectedId);

  if (isLoading) {
    return (
      <section className="w-full bg-white py-12 sm:py-16 lg:py-20 min-h-screen">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <LoadingState message="Chargement de vos rendez-vous..." />
        </div>
      </section>
    );
  }

  return (
    <section className="w-full bg-white py-12 sm:py-16 lg:py-20 min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 mb-4">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-medium tracking-wide text-sky-700">Mes rendez-vous</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Mes rendez-vous</h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Consultez, gerez et suivez l'avancement de vos rendez-vous
          </p>
        </header>

        <StatsGrid stats={stats} />

        {active.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-emerald-500 rounded-full" />
              Rendez-vous a venir
            </h2>
            <div className="space-y-3">
              {active.map((rv: RendezVousResponse) => (
                <MesRendezVousCard
                  key={rv.id}
                  rendezVous={rv}
                  destinationName={getDestinationName(rv.destinationId)}
                  consultantName={getConsultantName(rv.consultantId)}
                  statusConfig={getStatusStyle(rv.status)}
                  isExpanded={showDetails === rv.id}
                  onToggleExpand={() => setShowDetails(showDetails === rv.id ? null : rv.id)}
                  onCancel={() => handleCancel(rv.id)}
                  onReschedule={() => handleReschedule(rv.id)}
                  isActionable={isActionable(rv.status)}
                />
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-slate-400 rounded-full" />
              Historique
            </h2>
            <div className="space-y-3">
              {past.map((rv: RendezVousResponse) => (
                <MesRendezVousCard
                  key={rv.id}
                  rendezVous={rv}
                  destinationName={getDestinationName(rv.destinationId)}
                  consultantName={getConsultantName(rv.consultantId)}
                  statusConfig={getStatusStyle(rv.status)}
                  isExpanded={showDetails === rv.id}
                  onToggleExpand={() => setShowDetails(showDetails === rv.id ? null : rv.id)}
                  isPast
                />
              ))}
            </div>
          </section>
        )}

        {(!rendezVous || rendezVous.length === 0) && (
          <EmptyState
            title="Aucun rendez-vous"
            description="Vous n'avez pas encore de rendez-vous programme"
            icon={<Calendar className="w-7 h-7" />}
            action={
              <button
                type="button"
                onClick={() => router.push('/etudiant/prendre-rendez-vous')}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Prendre un rendez-vous
              </button>
            }
          />
        )}

        {action === 'cancel' && selectedRendezVous && (
          <ConfirmationModal
            isOpen={true}
            onClose={() => { setAction(null); setSelectedId(null); }}
            onConfirm={confirmCancel}
            title="Annuler le rendez-vous"
            subtitle={`${selectedRendezVous.firstName} ${selectedRendezVous.lastName} — ${getDestinationName(selectedRendezVous.destinationId)}`}
            variant="danger"
            isPending={cancelRendezVous.isPending}
            confirmLabel={cancelRendezVous.isPending ? 'Annulation...' : "Confirmer l'annulation"}
            details={[
              { label: 'Date', value: formatFrenchDate(selectedRendezVous.date) },
              { label: 'Horaire', value: TIME_SLOT_LABELS[selectedRendezVous.time as TimeSlot] },
              { label: 'Consultant', value: getConsultantName(selectedRendezVous.consultantId) },
            ]}
            warningMessage="Cette action est irreversible. Toutes les parties concernees seront notifiees."
          />
        )}

        {action === 'reschedule' && selectedRendezVous && (
          <RescheduleModal
            isOpen={true}
            onClose={() => { setAction(null); setSelectedId(null); }}
            onConfirm={confirmReschedule}
            currentDate={selectedRendezVous.date}
            currentTime={selectedRendezVous.time}
            itemLabel={`${selectedRendezVous.firstName} ${selectedRendezVous.lastName}`}
            variant="student"
            isPending={rescheduleRendezVous.isPending}
            additionalInfo={[
              { label: 'Destination', value: getDestinationName(selectedRendezVous.destinationId) },
              { label: 'Consultant', value: getConsultantName(selectedRendezVous.consultantId) },
            ]}
          />
        )}
      </div>
    </section>
  );
}
