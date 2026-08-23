'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { LoadingState, EmptyState, SearchInput, FilterBar } from '@/src/components/common';
import { consultantUnavailabilityService } from '@/src/services/consultant-unavailability.service';
import { useConsultantUnavailabilities, useConsultantUnavailabilityRealtime } from '@/src/hooks/use-consultant-unavailability';
import type { UnavailabilityResponse } from '@/src/types/availability';
import type { UserResponse } from '@/src/types/user';
import { useUsersByRole } from '@/src/hooks/use-users';
import { UserRole } from '@/src/types/enums';
import { AbsenceType, ABSENCE_TYPE_LABELS } from '@/src/types/enums';
import { Calendar, Clock, User, Search, RefreshCw, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

export default function AdminAbsencesPage() {
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  useConsultantUnavailabilityRealtime();

  const { data: consultants } = useUsersByRole(UserRole.CONSULTANT);
  const consultantList: UserResponse[] = consultants || [];

  const { data: absences, isLoading, error, refetch } = useConsultantUnavailabilities(selectedConsultantId);

  const consultantMap = useMemo(() => {
    const map = new Map<string, { firstName: string; lastName: string; email: string }>();
    for (const c of consultantList) {
      map.set(c.id, { firstName: c.firstName, lastName: c.lastName, email: c.email });
    }
    return map;
  }, [consultantList]);

  const absenceList = useMemo(() => {
    let list = Array.isArray(absences) ? absences : absences || [];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter((a: UnavailabilityResponse) => {
        const consultant = consultantMap.get(a.consultantId);
        return (
          consultant?.firstName?.toLowerCase().includes(q) ||
          consultant?.lastName?.toLowerCase().includes(q)
        );
      });
    }
    if (typeFilter !== 'ALL') {
      list = list.filter((a: UnavailabilityResponse) => a.type === typeFilter);
    }
    return list;
  }, [absences, searchTerm, typeFilter, consultantMap]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Absences</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Consultez les indisponibilités déclarées par les consultants.
        </p>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <select
            value={selectedConsultantId}
            onChange={(e) => setSelectedConsultantId(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500"
          >
            <option value="">Tous les consultants</option>
            {consultantList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Rechercher..."
            className="md:max-w-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:border-sky-300 hover:text-sky-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </button>
          {selectedConsultantId && (
            <Link href={`/admin/absences/nouvelle?consultantId=${selectedConsultantId}`} className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" />
              Nouvelle absence
            </Link>
          )}
        </div>
      </div>

      <FilterBar
        filters={[
          { value: 'ALL', label: 'Tous' },
          ...Object.values(AbsenceType).map((type) => ({
            value: type,
            label: ABSENCE_TYPE_LABELS[type] || type,
          })),
        ]}
        activeFilter={typeFilter}
        onFilterChange={setTypeFilter}
      />

      {isLoading ? (
        <LoadingState message="Chargement des absences..." />
      ) : error ? (
        <div className="p-6 text-center text-sm text-red-600">Erreur lors du chargement</div>
      ) : absenceList.length === 0 ? (
        <EmptyState title="Aucune absence" description="Aucune absence ne correspond à vos critères." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {absenceList.map((absence: UnavailabilityResponse) => {
            const consultant = consultantMap.get(absence.consultantId);
            return (
            <div
              key={absence.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {consultant?.firstName} {consultant?.lastName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{consultant?.email}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Du {absence.startDate} au {absence.endDate}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {ABSENCE_TYPE_LABELS[absence.type] || absence.type}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
