'use client';

import React, { useState, useMemo } from 'react';
import { RefreshCw, FileText } from 'lucide-react';
import { LoadingState, EmptyState, SearchInput, FilterBar } from '@/src/components/common';
import { AdminProcedureTable } from '@/src/components/admin/procedures/AdminProcedureTable';
import {
  useAllProceduresAdmin,
  useCompleteProcedure,
  useRejectProcedure,
  useCancelProcedure,
  useProcedureRealtime,
} from '@/src/hooks/use-procedure';
import { useUsers } from '@/src/hooks/use-users';
import { useDestinations } from '@/src/hooks/use-destinations';
import { ProcedureStatus } from '@/src/types/enums';
import type { ProcedureResponse } from '@/src/types/procedure';

export default function AdminProceduresPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // 1. Activer temps réel
  useProcedureRealtime();

  // 2. Récupérer données
  const { data: proceduresData, isLoading: isLoadingProcedures, refetch: refetchProcedures } = useAllProceduresAdmin();
  const { data: usersData } = useUsers();
  const { data: destinationsData } = useDestinations();

  const completeMutation = useCompleteProcedure();
  const rejectMutation = useRejectProcedure();
  const cancelMutation = useCancelProcedure();

  // Maps
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

  const procedures: ProcedureResponse[] = useMemo(() => {
    const list: ProcedureResponse[] = Array.isArray(proceduresData)
      ? proceduresData
      : (proceduresData as any)?.data || [];

    return list.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const studentName = usersMap.get(p.studentId)?.toLowerCase() || '';
        const consultantName = usersMap.get(p.consultantId)?.toLowerCase() || '';
        const destinationName = destinationsMap.get(p.destinationId)?.toLowerCase() || '';
        const dossier = p.numeroDossier?.toLowerCase() || '';
        return (
          studentName.includes(q) ||
          consultantName.includes(q) ||
          destinationName.includes(q) ||
          dossier.includes(q)
        );
      }
      return true;
    });
  }, [proceduresData, statusFilter, searchTerm, usersMap, destinationsMap]);

  const getStudentName = (id: string) => usersMap.get(id) || 'Étudiant';
  const getConsultantName = (id: string) => usersMap.get(id) || 'Consultant';
  const getDestinationName = (id: string) => destinationsMap.get(id) || 'Destination';

  const handleComplete = (procedure: ProcedureResponse) => {
    completeMutation.mutate(procedure.id);
  };

  const handleReject = (procedure: ProcedureResponse) => {
    const reason = prompt('Motif de rejet du dossier :');
    if (!reason) return;
    rejectMutation.mutate({ id: procedure.id, reason });
  };

  const handleCancel = (procedure: ProcedureResponse) => {
    const reason = prompt('Motif d\'annulation du dossier :');
    if (!reason) return;
    cancelMutation.mutate({ id: procedure.id, reason });
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-sky-600" />
            Procédures d'admission
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Suivez et validez les dossiers d'orientation et de visa des étudiants.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetchProcedures()}
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
          placeholder="Rechercher par étudiant, consultant, destination ou n° dossier..."
          className="w-full"
        />

        <FilterBar
          filters={[
            { value: 'ALL', label: 'Tous les dossiers' },
            { value: ProcedureStatus.IN_PROGRESS, label: 'En cours' },
            { value: ProcedureStatus.COMPLETED, label: 'Terminés' },
            { value: ProcedureStatus.REJECTED, label: 'Rejetés' },
            { value: ProcedureStatus.CANCELLED, label: 'Annulés' },
          ]}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
        />
      </div>

      {/* Tableau ou état de chargement */}
      {isLoadingProcedures ? (
        <LoadingState message="Chargement des procédures..." />
      ) : procedures.length === 0 ? (
        <EmptyState
          title={searchTerm ? 'Aucune procédure trouvée' : 'Aucune procédure'}
          description={
            searchTerm
              ? 'Aucun dossier ne correspond à vos critères de recherche.'
              : 'Les dossiers de candidature apparaîtront ici.'
          }
          icon={<FileText className="w-7 h-7" />}
        />
      ) : (
        <AdminProcedureTable
          procedures={procedures}
          getDestinationName={getDestinationName}
          getConsultantName={getConsultantName}
          getStudentName={getStudentName}
          onComplete={handleComplete}
          onReject={handleReject}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
