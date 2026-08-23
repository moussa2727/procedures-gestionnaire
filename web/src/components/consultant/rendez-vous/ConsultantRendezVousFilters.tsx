'use client';

import React from 'react';
import { SearchInput, FilterBar } from '@/src/components/common';
import type { FilterOption } from '@/src/components/common';
import { LayoutGrid, ListFilter, MapPin } from 'lucide-react';
import { RendezvousStatus, Opinion } from '@/src/types/enums';
import type { DestinationResponse } from '@/src/types/destination';

type StatusFilter = 'ALL' | RendezvousStatus;
type OpinionFilter = 'ALL' | Opinion | 'NO_OPINION';
type ViewMode = 'list' | 'agenda';

interface ConsultantRendezVousFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  opinionFilter: OpinionFilter;
  onOpinionFilterChange: (value: OpinionFilter) => void;
  selectedDestinationFilter: string;
  onDestinationFilterChange: (value: string) => void;
  destinations: DestinationResponse[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const statusFilterOptions = [
  { value: 'ALL', label: 'Tous' },
  { value: RendezvousStatus.CONFIRMED, label: 'Confirmes' },
  { value: RendezvousStatus.COMPLETED, label: 'Termines' },
  { value: RendezvousStatus.CANCELLED, label: 'Annules' },
] as FilterOption[];

const opinionFilterOptions = [
  { value: 'ALL', label: 'Tous' },
  { value: Opinion.FAVORABLE, label: 'Favorables' },
  { value: Opinion.UNFAVORABLE, label: 'Defavorables' },
  { value: 'NO_OPINION', label: "En attente d'avis" },
] as FilterOption[];

export function ConsultantRendezVousFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  opinionFilter,
  onOpinionFilterChange,
  selectedDestinationFilter,
  onDestinationFilterChange,
  destinations,
  viewMode,
  onViewModeChange,
}: ConsultantRendezVousFiltersProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <SearchInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Rechercher par nom, email, telephone, filiere, destination..."
          className="flex-1"
        />

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Liste</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('agenda')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                viewMode === 'agenda' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Agenda</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
        <FilterBar
          filters={statusFilterOptions}
          activeFilter={statusFilter}
          onFilterChange={(v) => onStatusFilterChange(v as StatusFilter)}
          label="Statut :"
        />

        <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

        <FilterBar
          filters={opinionFilterOptions}
          activeFilter={opinionFilter}
          onFilterChange={(v) => onOpinionFilterChange(v as OpinionFilter)}
          label="Avis :"
        />

        <div className="ml-auto flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <select
            id="filter-destination-select"
            value={selectedDestinationFilter}
            onChange={(e) => onDestinationFilterChange(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            <option value="ALL">Toutes destinations</option>
            {destinations.map((d: DestinationResponse) => (
              <option key={d.id} value={d.id}>
                {d.country}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
