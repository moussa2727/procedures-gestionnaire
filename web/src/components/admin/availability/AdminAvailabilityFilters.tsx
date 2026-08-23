// components/admin/availability/AdminAvailabilityFilters.tsx
'use client';

import { X, Calendar, User } from 'lucide-react';
import { SearchInput, FilterBar } from '@/src/components/common';
import { AbsenceType, ABSENCE_TYPE_LABELS } from '@/src/types/enums';
import type { UnavailabilityResponse } from '@/src/types/availability';
import type { ConsultantSemiPublicProfile } from '@/src/types/user';

interface AdminAvailabilityFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  consultantFilter: string;
  onConsultantFilterChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  availabilities: UnavailabilityResponse[];
  consultants: ConsultantSemiPublicProfile[];
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onCreateClick: () => void;
  className?: string;
}

const typeOptions = [
  { value: 'all', label: 'Tous' },
  ...Object.values(AbsenceType).map((type) => ({
    value: type,
    label: ABSENCE_TYPE_LABELS[type],
  })),
];

export function AdminAvailabilityFilters({
  searchTerm,
  onSearchChange,
  consultantFilter,
  onConsultantFilterChange,
  typeFilter,
  onTypeFilterChange,
  availabilities,
  consultants,
  hasActiveFilters,
  onResetFilters,
  onCreateClick,
  className = '',
}: AdminAvailabilityFiltersProps) {
  // Compter les indisponibilités par type
  const typeCounts: Record<string, number> = { all: availabilities.length };
  Object.values(AbsenceType).forEach((type) => {
    typeCounts[type] = availabilities.filter((a) => a.type === type).length;
  });

  const filtersWithCount = typeOptions.map((opt) => ({
    ...opt,
    count: typeCounts[opt.value] || 0,
  }));

  // Options consultants
  const consultantOptions = [
    { value: 'all', label: 'Tous les consultants' },
    ...consultants.map((c) => ({
      value: c.id,
      label: `${c.firstName} ${c.lastName}`,
    })),
  ];

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SearchInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Rechercher par consultant, motif..."
          className="flex-1"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCreateClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Nouvelle indisponibilité</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-2.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5 inline mr-1" />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Filtre consultant */}
        <div className="flex items-center gap-1.5 text-xs">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={consultantFilter}
            onChange={(e) => onConsultantFilterChange(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            {consultantOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filtre type */}
        <div className="flex-1">
          <FilterBar
            label="Type :"
            filters={filtersWithCount}
            activeFilter={typeFilter}
            onFilterChange={onTypeFilterChange}
          />
        </div>
      </div>
    </div>
  );
}