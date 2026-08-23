'use client';

import React, { useState, useMemo } from 'react';
import { RefreshCw, Calendar } from 'lucide-react';
import { LoadingState, EmptyState, SearchInput, FilterBar, CancelModal, RescheduleModal } from '@/src/components/common';
import { AdminRendezVousTable } from '@/src/components/admin/rendez-vous/AdminRendezVousTable';
import { OpinionModal } from '@/src/components/common/rendez-vous';
import {
  useAllRendezVousAdmin,
  useCompleteRendezVous,
  useRendezVousRealtime,
  rendezVousKeys,
} from '@/src/hooks/use-rendez-vous';
import { rendezVousService } from '@/src/services/rendez-vous.service';
import { extractErrorMessage } from '@/src/lib/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { availabilityKeys } from '@/src/hooks/use-availability';
import { useUsers } from '@/src/hooks/use-users';
import { useDestinations } from '@/src/hooks/use-destinations';
import { RendezvousStatus, TimeSlot, Opinion } from '@/src/types/enums';
import type { RendezVousResponse } from '@/src/types/rendez-vous';
import type { UserResponse } from '@/src/types/user';
import type { DestinationResponse } from '@/src/types/destination';
import type { PaginatedResult } from '@/src/types/common';

export default function AdminRendezVousPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [cancellingRv, setCancellingRv] = useState<RendezVousResponse | null>(null);
  const [reschedulingRv, setReschedulingRv] = useState<RendezVousResponse | null>(null);

  // 1. Activer temps réel
  useRendezVousRealtime();

  // 2. Récupérer données
  const { data: rendezVousData, isLoading: isLoadingRv, refetch: refetchRv } = useAllRendezVousAdmin();
  const { data: usersData } = useUsers();
  const { data: destinationsData } = useDestinations();

  const completeMutation = useCompleteRendezVous();

  const qc = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rendezVousService.cancel(id, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rendezVousKeys.all });
      qc.invalidateQueries({ queryKey: availabilityKeys.all });
      toast.success('Rendez-vous annulé');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, date, time }: { id: string; date: string; time: TimeSlot }) =>
      rendezVousService.reschedule(id, { date, time }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rendezVousKeys.all });
      qc.invalidateQueries({ queryKey: availabilityKeys.all });
      toast.success('Rendez-vous replanifié');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });

  const opinionMutation = useMutation({
    mutationFn: ({ id, opinion }: { id: string; opinion: Opinion }) =>
      rendezVousService.setOpinion(id, { opinion }),
    onSuccess: (rv) => {
      qc.invalidateQueries({ queryKey: rendezVousKeys.detail(rv.id) });
      qc.invalidateQueries({ queryKey: rendezVousKeys.all });
      qc.invalidateQueries({ queryKey: availabilityKeys.all });
      toast.success('Avis enregistré');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });

  const [opinionRv, setOpinionRv] = useState<RendezVousResponse | null>(null);

  // Maps
  const usersMap = useMemo(() => {
    const map = new Map<string, string>();
    const users: UserResponse[] = Array.isArray(usersData)
      ? usersData
      : (usersData as PaginatedResult<UserResponse>)?.items || [];
    users.forEach((u) => {
      map.set(u.id, `${u.firstName} ${u.lastName}`);
    });
    return map;
  }, [usersData]);

  const destinationsMap = useMemo(() => {
    const map = new Map<string, string>();
    const dests: DestinationResponse[] = Array.isArray(destinationsData)
      ? destinationsData
      : (destinationsData as unknown as { data?: DestinationResponse[] })?.data || [];
    dests.forEach((d) => {
      map.set(d.id, d.country);
    });
    return map;
  }, [destinationsData]);

  const appointments: RendezVousResponse[] = useMemo(() => {
    const list: RendezVousResponse[] = Array.isArray(rendezVousData)
      ? rendezVousData
      : (rendezVousData as any)?.data || [];

    return list.filter((rv) => {
      if (statusFilter !== 'ALL' && rv.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const candidateName = `${rv.firstName} ${rv.lastName}`.toLowerCase();
        const candidateEmail = (rv.email || '').toLowerCase();
        const consultantName = usersMap.get(rv.consultantId)?.toLowerCase() || '';
        const destinationName = destinationsMap.get(rv.destinationId)?.toLowerCase() || '';
        return (
          candidateName.includes(q) ||
          candidateEmail.includes(q) ||
          consultantName.includes(q) ||
          destinationName.includes(q)
        );
      }
      return true;
    });
  }, [rendezVousData, statusFilter, searchTerm, usersMap, destinationsMap]);

  const getStudentName = (id: string) => usersMap.get(id) || 'Étudiant';
  const getConsultantName = (id: string) => usersMap.get(id) || 'Consultant';
  const getDestinationName = (id: string) => destinationsMap.get(id) || 'Destination';

  const handleComplete = (rv: RendezVousResponse) => {
    completeMutation.mutate(rv.id);
  };

  const handleOpinion = (rv: RendezVousResponse) => {
    setOpinionRv(rv);
  };

  const handleOpinionSave = async (opinion: Opinion) => {
    if (!opinionRv) return;
    await opinionMutation.mutateAsync({ id: opinionRv.id, opinion });
    setOpinionRv(null);
  };

  const handleCancelSubmit = async (reason: string) => {
    if (!cancellingRv) return;
    await cancelMutation.mutateAsync({ id: cancellingRv.id, reason });
    setCancellingRv(null);
  };

  const handleRescheduleSubmit = async (date: string, time: TimeSlot) => {
    if (!reschedulingRv) return;
    await rescheduleMutation.mutateAsync({ id: reschedulingRv.id, date, time });
    setReschedulingRv(null);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-sky-600" />
            Gestion des rendez-vous
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Supervisez les entretiens initiaux et les rendez-vous d'orientation planifiés.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetchRv()}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-300 hover:border-sky-400 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-xs hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Barre de filtres et recherche */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Rechercher par candidat, email, consultant ou destination..."
          className="w-full"
        />

        <FilterBar
          filters={[
            { value: 'ALL', label: 'Tous les rendez-vous' },
            { value: RendezvousStatus.PENDING, label: 'En attente' },
            { value: RendezvousStatus.CONFIRMED, label: 'Confirmés' },
            { value: RendezvousStatus.COMPLETED, label: 'Effectués' },
            { value: RendezvousStatus.CANCELLED, label: 'Annulés' },
          ]}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
        />
      </div>

      {/* Tableau ou état de chargement */}
      {isLoadingRv ? (
        <LoadingState message="Chargement des rendez-vous..." />
      ) : appointments.length === 0 ? (
        <EmptyState
          title={searchTerm ? 'Aucun rendez-vous trouvé' : 'Aucun rendez-vous'}
          description={
            searchTerm
              ? 'Aucun rendez-vous ne correspond à vos critères de recherche.'
              : 'Les prises de rendez-vous apparaîtront ici.'
          }
          icon={<Calendar className="w-7 h-7" />}
        />
      ) : (
        <AdminRendezVousTable
          appointments={appointments}
          getDestinationName={getDestinationName}
          getConsultantName={getConsultantName}
          getStudentName={getStudentName}
          onComplete={handleComplete}
          onOpinion={handleOpinion}
          onReschedule={(rv) => setReschedulingRv(rv)}
          onCancel={(rv) => setCancellingRv(rv)}
        />
      )}

      {/* Modal d'annulation */}
      {cancellingRv && (
        <CancelModal
          isOpen={true}
          onClose={() => setCancellingRv(null)}
          onConfirm={handleCancelSubmit}
          isPending={cancelMutation.isPending}
          title="Annuler le rendez-vous"
          subtitle="Indiquez le motif d'annulation du rendez-vous."
          details={[
            { label: 'Candidat', value: `${cancellingRv.firstName} ${cancellingRv.lastName}` },
            { label: 'Email', value: cancellingRv.email },
            { label: 'Date', value: new Date(cancellingRv.date).toLocaleDateString('fr-FR') },
            { label: 'Consultant', value: usersMap.get(cancellingRv.consultantId) || 'Inconnu' },
          ]}
          infoMessage="Cette action annulera le rendez-vous et notifiera le candidat et le consultant."
        />
      )}

      {/* Modal de replanification */}
       {reschedulingRv && (
        <RescheduleModal
          isOpen={true}
          onClose={() => setReschedulingRv(null)}
          onConfirm={handleRescheduleSubmit}
          isPending={rescheduleMutation.isPending}
          currentDate={reschedulingRv.date}
          currentTime={reschedulingRv.time as TimeSlot}
          itemLabel={`${reschedulingRv.firstName} ${reschedulingRv.lastName}`}
        />
      )}

      {opinionRv && (
        <OpinionModal
          isOpen={true}
          onClose={() => setOpinionRv(null)}
          rendezVous={opinionRv}
          destinationName={getDestinationName(opinionRv.destinationId)}
          onSave={handleOpinionSave}
          isPending={opinionMutation.isPending}
        />
      )}
    </div>
  );
}

