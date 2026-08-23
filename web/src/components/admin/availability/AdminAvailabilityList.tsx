// components/admin/availability/AdminAvailabilityList.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { RefreshCw, CalendarDays, Plus } from 'lucide-react';
import { EmptyState, LoadingState } from '@/src/components/common';
import { AdminAvailabilityCard } from './AdminAvailabilityCard';
import { AdminAvailabilityFilters } from './AdminAvailabilityFilters';
import { AbsenceType } from '@/src/types/enums';
import type { UnavailabilityResponse } from '@/src/types/availability';
import type { ConsultantSemiPublicProfile } from '@/src/types/user';

interface AdminAvailabilityListProps {
  availabilities: UnavailabilityResponse[];
  consultants: ConsultantSemiPublicProfile[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  className?: string;
}

type TypeFilter = 'all' | AbsenceType;

export function AdminAvailabilityList({
  availabilities,
  consultants,
  isLoading,
  onRefresh,
  onCreate,
  onDelete,
  className = '',
}: AdminAvailabilityListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [consultantFilter, setConsultantFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Helper pour obtenir le nom d'un consultant
  const getConsultantName = (consultantId: string) => {
    const consultant = consultants.find((c) => c.id === consultantId);
    return consultant ? `${consultant.firstName} ${consultant.lastName}` : undefined;
  };

  // Filtrage et recherche
  const filteredAvailabilities = useMemo(() => {
    let result = [...availabilities];

    // Filtre par consultant
    if (consultantFilter !== 'all') {
      result = result.filter((a) => a.consultantId === consultantFilter);
    }

    // Filtre par type
    if (typeFilter !== 'all') {
      result = result.filter((a) => a.type === typeFilter);
    }

    // Recherche textuelle
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (a) =>
          getConsultantName(a.consultantId)?.toLowerCase().includes(q) ||
          (a.reason && a.reason.toLowerCase().includes(q)) ||
          a.id.toLowerCase().includes(q)
      );
    }

    // Tri par date de début (plus récentes d'abord)
    return result.sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
  }, [availabilities, consultantFilter, typeFilter, searchTerm]);

  const hasActiveFilters = searchTerm !== '' || consultantFilter !== 'all' || typeFilter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setConsultantFilter('all');
    setTypeFilter('all');
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (isLoading) {
    return <LoadingState message="Chargement des indisponibilités..." />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-sky-600" />
            Gestion des indisponibilités
          </h2>
          <p className="text-sm text-slate-500">
            Gérez les périodes d'indisponibilité des consultants
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-300 hover:border-sky-400 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Actualiser</span>
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvelle indisponibilité</span>
          </button>
        </div>
      </div>

      {/* Filtres */}
      <AdminAvailabilityFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        consultantFilter={consultantFilter}
        onConsultantFilterChange={setConsultantFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={(value: string) => setTypeFilter(value as TypeFilter)}
        availabilities={availabilities}
        consultants={consultants}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
        onCreateClick={onCreate}
      />

      {/* Liste */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Indisponibilités</span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
              {filteredAvailabilities.length}
            </span>
          </h3>
        </div>

        {filteredAvailabilities.length === 0 ? (
          <EmptyState
            title={searchTerm ? 'Aucune indisponibilité trouvée' : 'Aucune indisponibilité'}
            description={
              searchTerm
                ? 'Aucune indisponibilité ne correspond à votre recherche.'
                : 'Aucune indisponibilité enregistrée pour le moment.'
            }
            action={
              !searchTerm && (
                <button
                  type="button"
                  onClick={onCreate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter une indisponibilité
                </button>
              )
            }
          />
        ) : (
          filteredAvailabilities.map((availability) => (
            <AdminAvailabilityCard
              key={availability.id}
              availability={availability}
              consultantName={getConsultantName(availability.consultantId)}
              isExpanded={expandedId === availability.id}
              onToggleExpand={() => toggleExpand(availability.id)}
              onDelete={() => onDelete(availability.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}