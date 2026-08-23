// components/admin/destinations/AdminDestinationList.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { RefreshCw, Building2, Plus } from 'lucide-react';
import { EmptyState, LoadingState } from '@/src/components/common';
import { AdminDestinationCard } from './AdminDestinationCard';
import { AdminDestinationFilters } from './AdminDestinationFilters';
import { AdminDestinationStats } from './AdminDestinationStats';
import type { DestinationResponse } from '@/src/types/destination';

interface AdminDestinationListProps {
  destinations: DestinationResponse[];
  isLoading: boolean;
  consultantMap?: Record<string, { count: number; names: string[] }>;
  onRefresh: () => void;
  onCreate: () => void;
  onEdit: (destination: DestinationResponse) => void;
  onArchive: (destination: DestinationResponse) => void;
  onRestore: (destination: DestinationResponse) => void;
  onDelete: (destination: DestinationResponse) => void;
  onViewDetails?: (destination: DestinationResponse) => void;
  className?: string;
}

type FilterType = 'all' | 'active' | 'archived' | 'withConsultants' | 'withoutConsultants';

export function AdminDestinationList({
  destinations,
  isLoading,
  consultantMap = {},
  onRefresh,
  onCreate,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onViewDetails,
  className = '',
}: AdminDestinationListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Calcul des statistiques
  const stats = useMemo(() => {
    const total = destinations.length;
    const active = destinations.filter((d) => !d.isDeleted).length;
    const archived = destinations.filter((d) => d.isDeleted).length;
    const withConsultants = destinations.filter(
      (d) => (consultantMap[d.id]?.count || 0) > 0
    ).length;
    const withoutConsultants = destinations.filter(
      (d) => (consultantMap[d.id]?.count || 0) === 0
    ).length;

    return { total, active, archived, withConsultants, withoutConsultants };
  }, [destinations, consultantMap]);

  // Filtrage et recherche
  const filteredDestinations = useMemo(() => {
    let result = [...destinations];

    // Filtre
    if (filter === 'active') {
      result = result.filter((d) => !d.isDeleted);
    } else if (filter === 'archived') {
      result = result.filter((d) => d.isDeleted);
    } else if (filter === 'withConsultants') {
      result = result.filter((d) => (consultantMap[d.id]?.count || 0) > 0);
    } else if (filter === 'withoutConsultants') {
      result = result.filter((d) => (consultantMap[d.id]?.count || 0) === 0);
    }

    // Recherche
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.country.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q))
      );
    }

    // Tri par date de création (plus récentes d'abord)
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [destinations, filter, searchTerm, consultantMap]);

  const hasActiveFilters = searchTerm !== '' || filter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setFilter('all');
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (isLoading) {
    return <LoadingState message="Chargement des destinations..." />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-600" />
            Gestion des destinations
          </h2>
          <p className="text-sm text-slate-500">
            Gérez les pays et établissements proposés aux étudiants
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-300 hover:border-sky-400 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Statistiques */}
      <AdminDestinationStats stats={stats} />

      {/* Filtres */}
      <AdminDestinationFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filter={filter}
        onFilterChange={(value) => setFilter(value as FilterType)}
        destinations={destinations}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
        onCreateClick={onCreate}
      />

      {/* Liste */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Destinations</span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
              {filteredDestinations.length}
            </span>
          </h3>
        </div>

        {filteredDestinations.length === 0 ? (
          <EmptyState
            title={searchTerm ? 'Aucune destination trouvée' : 'Aucune destination'}
            description={
              searchTerm
                ? 'Aucune destination ne correspond à votre recherche.'
                : 'Commencez par créer votre première destination.'
            }
            action={
              !searchTerm && (
                <button
                  type="button"
                  onClick={onCreate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Créer une destination
                </button>
              )
            }
          />
        ) : (
          filteredDestinations.map((destination) => {
            const consultantInfo = consultantMap[destination.id] || { count: 0, names: [] };
            return (
              <AdminDestinationCard
                key={destination.id}
                destination={destination}
                consultantCount={consultantInfo.count}
                consultantNames={consultantInfo.names}
                isExpanded={expandedId === destination.id}
                onToggleExpand={() => toggleExpand(destination.id)}
                onEdit={() => onEdit(destination)}
                onArchive={() => onArchive(destination)}
                onRestore={() => onRestore(destination)}
                onDelete={() => onDelete(destination)}
                onViewDetails={onViewDetails ? () => onViewDetails(destination) : undefined}
              />
            );
          })
        )}
      </div>
    </div>
  );
}