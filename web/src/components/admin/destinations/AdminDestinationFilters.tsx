// components/admin/destinations/AdminDestinationFilters.tsx
'use client';

import React from 'react';
import { Search, X, Plus, Filter } from 'lucide-react';
import { SearchInput, FilterBar } from '@/src/components/common';
import type { DestinationResponse } from '@/src/types/destination';

interface AdminDestinationFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filter: 'all' | 'active' | 'archived' | 'withConsultants' | 'withoutConsultants';
  onFilterChange: (value: string) => void;
  destinations: DestinationResponse[];
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onCreateClick: () => void;
  className?: string;
}

const filterOptions = [
  { value: 'all', label: 'Toutes' },
  { value: 'active', label: 'Actives' },
  { value: 'archived', label: 'Archivées' },
  { value: 'withConsultants', label: 'Avec consultants' },
  { value: 'withoutConsultants', label: 'Sans consultant' },
];

export function AdminDestinationFilters({
  searchTerm,
  onSearchChange,
  filter,
  onFilterChange,
  destinations,
  hasActiveFilters,
  onResetFilters,
  onCreateClick,
  className = '',
}: AdminDestinationFiltersProps) {
  // Compter les destinations par filtre
  const counts = {
    all: destinations.length,
    active: destinations.filter((d) => !d.isDeleted).length,
    archived: destinations.filter((d) => d.isDeleted).length,
    withConsultants: destinations.filter((d) => (d.activeConsultantsCount || 0) > 0).length,
    withoutConsultants: destinations.filter((d) => (d.activeConsultantsCount || 0) === 0).length,
  };

  const filtersWithCount = filterOptions.map((opt) => ({
    ...opt,
    count: counts[opt.value as keyof typeof counts] || 0,
  }));

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SearchInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Rechercher une destination par pays..."
          className="flex-1"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCreateClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvelle destination</span>
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

      <FilterBar
        label="Filtrer :"
        filters={filtersWithCount}
        activeFilter={filter}
        onFilterChange={onFilterChange}
      />
    </div>
  );
}