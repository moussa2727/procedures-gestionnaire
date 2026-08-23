// app/(gestionnaire)/admin/follow-up/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { RefreshCw, CalendarDays, Search } from 'lucide-react';
import { LoadingState, EmptyState, SearchInput, FilterBar, CancelModal, RescheduleModal } from '@/src/components/common';
import { AdminFollowUpTable } from '@/src/components/admin/follow-up-meeting/AdminFollowUpTable';
import {
  useMyFollowUpMeetings,
  useCompleteFollowUpMeeting,
  useFollowUpMeetingRealtime,
  followUpMeetingKeys,
} from '@/src/hooks/use-follow-up-meeting';
import { followUpMeetingService } from '@/src/services/follow-up-meeting.service';
import { extractErrorMessage } from '@/src/lib/api-client';
import { procedureKeys } from '@/src/hooks/use-procedure';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUsers } from '@/src/hooks/use-users';
import { useDestinations } from '@/src/hooks/use-destinations';
import { useAllProceduresAdmin } from '@/src/hooks/use-procedure';
import { MeetingStatus, TimeSlot } from '@/src/types/enums';
import type { FollowUpMeetingResponse } from '@/src/types/follow-up-meeting';

export default function AdminFollowUpPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [cancellingMeeting, setCancellingMeeting] = useState<FollowUpMeetingResponse | null>(null);
  const [reschedulingMeeting, setReschedulingMeeting] = useState<FollowUpMeetingResponse | null>(null);

  // 1. Activer temps réel
  useFollowUpMeetingRealtime();

  // 2. Récupérer réunions & données associées
  const { data: meetingsData, isLoading: isLoadingMeetings, refetch: refetchMeetings } = useMyFollowUpMeetings();
  const { data: usersData } = useUsers();
  const { data: destinationsData } = useDestinations();
  const { data: proceduresData } = useAllProceduresAdmin();

  const completeMutation = useCompleteFollowUpMeeting();

  const qc = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      followUpMeetingService.cancel(id, { reason }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: followUpMeetingKeys.detail(d.id) });
      qc.invalidateQueries({ queryKey: followUpMeetingKeys.mine() });
      qc.invalidateQueries({ queryKey: followUpMeetingKeys.mineConsultant() });
      if (d.procedureId) qc.invalidateQueries({ queryKey: procedureKeys.detail(d.procedureId) });
      toast.success('Rendez-vous de suivi annulé');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, date, time }: { id: string; date: string; time: TimeSlot }) =>
      followUpMeetingService.reschedule(id, { date, time }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: followUpMeetingKeys.detail(d.id) });
      qc.invalidateQueries({ queryKey: followUpMeetingKeys.mine() });
      qc.invalidateQueries({ queryKey: followUpMeetingKeys.mineConsultant() });
      if (d.procedureId) qc.invalidateQueries({ queryKey: procedureKeys.detail(d.procedureId) });
      toast.success('Rendez-vous de suivi replanifié');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });

  // Maps pour résolution rapide des noms
  const usersMap = useMemo(() => {
    const map = new Map<string, string>();
    const users = Array.isArray(usersData) ? usersData : usersData?.items || [];
    users.forEach((u: any) => {
      map.set(u.id, `${u.firstName} ${u.lastName}`);
    });
    return map;
  }, [usersData]);

  const destinationsMap = useMemo(() => {
    const map = new Map<string, string>();
    const dests = Array.isArray(destinationsData) ? destinationsData : (destinationsData as any)?.data || [];
    dests.forEach((d: any) => {
      map.set(d.id, d.country);
    });
    return map;
  }, [destinationsData]);

  const proceduresMap = useMemo(() => {
    const map = new Map<string, { numeroDossier: string; destinationId: string }>();
    const procs = Array.isArray(proceduresData) ? proceduresData : (proceduresData as any)?.data || [];
    procs.forEach((p: any) => {
      map.set(p.id, { numeroDossier: p.numeroDossier, destinationId: p.destinationId });
    });
    return map;
  }, [proceduresData]);

  // Filtrage
  const meetings = useMemo(() => {
    const list: FollowUpMeetingResponse[] = Array.isArray(meetingsData)
      ? meetingsData
      : (meetingsData as any)?.data || [];

    return list.filter((m) => {
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const studentName = usersMap.get(m.studentId)?.toLowerCase() || '';
        const consultantName = usersMap.get(m.consultantId)?.toLowerCase() || '';
        const procNumber = proceduresMap.get(m.procedureId)?.numeroDossier.toLowerCase() || '';
        return (
          studentName.includes(q) ||
          consultantName.includes(q) ||
          procNumber.includes(q) ||
          m.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [meetingsData, statusFilter, searchTerm, usersMap, proceduresMap]);

  const getStudentName = (id: string) => usersMap.get(id) || 'Étudiant';
  const getConsultantName = (id: string) => usersMap.get(id) || 'Consultant';
  const getProcedureNumber = (id: string) => proceduresMap.get(id)?.numeroDossier || id.slice(0, 8);
  const getDestinationName = (procId: string) => {
    const destId = proceduresMap.get(procId)?.destinationId;
    return destId ? destinationsMap.get(destId) || 'Destination' : 'Destination';
  };

  const handleComplete = (meeting: FollowUpMeetingResponse) => {
    completeMutation.mutate(meeting.id);
  };

  const handleCancelSubmit = async (reason: string) => {
    if (!cancellingMeeting) return;
    await cancelMutation.mutateAsync({ id: cancellingMeeting.id, reason });
    setCancellingMeeting(null);
  };

  const handleRescheduleSubmit = async (date: string, time: TimeSlot) => {
    if (!reschedulingMeeting) return;
    await rescheduleMutation.mutateAsync({ id: reschedulingMeeting.id, date, time });
    setReschedulingMeeting(null);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-sky-600" />
            Suivi des consultations
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Pilotez les rendez-vous de suivi et les échanges entre étudiants et consultants.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetchMeetings()}
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
          placeholder="Rechercher par étudiant, consultant ou n° de dossier..."
          className="w-full"
        />

        <FilterBar
          filters={[
            { value: 'ALL', label: 'Toutes les réunions' },
            { value: MeetingStatus.PENDING, label: 'En attente' },
            { value: MeetingStatus.CONFIRMED, label: 'Confirmées' },
            { value: MeetingStatus.COMPLETED, label: 'Effectuées' },
            { value: MeetingStatus.CANCELLED, label: 'Annulées' },
          ]}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
        />
      </div>

      {/* Tableau ou état de chargement */}
      {isLoadingMeetings ? (
        <LoadingState message="Chargement des rendez-vous de suivi..." />
      ) : meetings.length === 0 ? (
        <EmptyState
          title={searchTerm ? 'Aucune réunion trouvée' : 'Aucun rendez-vous de suivi'}
          description={
            searchTerm
              ? 'Aucun rendez-vous ne correspond à vos critères de recherche.'
              : 'Les rendez-vous de suivi planifiés apparaîtront ici.'
          }
          icon={<CalendarDays className="w-7 h-7" />}
        />
      ) : (
        <AdminFollowUpTable
          meetings={meetings}
          getDestinationName={getDestinationName}
          getConsultantName={getConsultantName}
          getStudentName={getStudentName}
          getProcedureNumber={getProcedureNumber}
          onComplete={handleComplete}
          onReschedule={(m) => setReschedulingMeeting(m)}
          onCancel={(m) => setCancellingMeeting(m)}
        />
      )}

      {/* Modal d'annulation */}
      {cancellingMeeting && (
        <CancelModal
          isOpen={true}
          onClose={() => setCancellingMeeting(null)}
          onConfirm={handleCancelSubmit}
          isPending={cancelMutation.isPending}
          title="Annuler le rendez-vous de suivi"
          subtitle="Indiquez le motif d'annulation de ce rendez-vous."
          details={[
            { label: 'Réunion', value: cancellingMeeting.id },
            { label: 'Consultant', value: usersMap.get(cancellingMeeting.consultantId) || 'Inconnu' },
          ]}
          infoMessage="Cette action annulera cette réunion de suivi et notifiera les parties concernées."
        />
      )}

      {/* Modal de replanification */}
      {reschedulingMeeting && (
        <RescheduleModal
          isOpen={true}
          onClose={() => setReschedulingMeeting(null)}
          onConfirm={handleRescheduleSubmit}
          isPending={rescheduleMutation.isPending}
          currentDate={reschedulingMeeting.date}
          currentTime={reschedulingMeeting.time as TimeSlot}
          itemLabel={`Réunion #${reschedulingMeeting.id}`}
        />
      )}
    </div>
  );
}

