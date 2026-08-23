// components/admin/contacts/AdminContactFilters.tsx
'use client';

import { X, Calendar, CheckCircle2 } from 'lucide-react';
import { SearchInput, FilterBar } from '@/src/components/common';
import { ContactStatus } from '@/src/types/enums';
import type { ContactResponse } from '@/src/types/contact';

interface AdminContactFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  dateFilter: 'all' | 'today' | 'week' | 'month';
  onDateFilterChange: (value: 'all' | 'today' | 'week' | 'month') => void;
  contacts: ContactResponse[];
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onMarkAllAsRead?: () => void;
  className?: string;
}

const statusOptions = [
  { value: 'all', label: 'Tous' },
  { value: ContactStatus.NEW, label: 'Nouveaux' },
  { value: ContactStatus.READ, label: 'Lus' },
  { value: ContactStatus.REPLIED, label: 'Répondus' },
  { value: ContactStatus.ARCHIVED, label: 'Archivés' },
];

export function AdminContactFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateFilter,
  onDateFilterChange,
  contacts,
  hasActiveFilters,
  onResetFilters,
  onMarkAllAsRead,
  className = '',
}: AdminContactFiltersProps) {
  // Compter les contacts par statut
  const counts = {
    all: contacts.length,
    [ContactStatus.NEW]: contacts.filter((c) => c.status === ContactStatus.NEW).length,
    [ContactStatus.READ]: contacts.filter((c) => c.status === ContactStatus.READ).length,
    [ContactStatus.REPLIED]: contacts.filter((c) => c.status === ContactStatus.REPLIED).length,
    [ContactStatus.ARCHIVED]: contacts.filter((c) => c.status === ContactStatus.ARCHIVED).length,
  };

  const filtersWithCount = statusOptions.map((opt) => ({
    ...opt,
    count: counts[opt.value as keyof typeof counts] || 0,
  }));

  // Filtres de date
  const dateFilters = [
    { value: 'all', label: 'Toutes les dates' },
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
  ];

  const hasNewMessages = contacts.some((c) => c.status === ContactStatus.NEW);

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SearchInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Rechercher par nom, email ou message..."
          className="flex-1"
        />

        <div className="flex items-center gap-2">
          {hasNewMessages && onMarkAllAsRead && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-xl transition-colors border border-sky-200"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Tout marquer comme lu</span>
            </button>
          )}

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
        {/* Filtres de statut */}
        <div className="flex-1">
          <FilterBar
            label="Statut :"
            filters={filtersWithCount}
            activeFilter={statusFilter}
            onFilterChange={onStatusFilterChange}
          />
        </div>

        {/* Filtres de date */}
        <div className="flex items-center gap-1.5 text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {dateFilters.map((df) => (
            <button
              key={df.value}
              type="button"
              onClick={() => onDateFilterChange(df.value as any)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap border ${
                dateFilter === df.value
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {df.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}