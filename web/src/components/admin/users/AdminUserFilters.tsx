// components/admin/users/AdminUserFilters.tsx
'use client';

import { X, Filter, Users } from 'lucide-react';
import { SearchInput, FilterBar } from '@/src/components/common';
import { UserRole } from '@/src/types/enums';
import type { UserResponse } from '@/src/types/user';

interface AdminUserFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  users: UserResponse[];
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onCreateClick: () => void;
  className?: string;
}

const roleOptions = [
  { value: 'all', label: 'Tous' },
  { value: UserRole.CONSULTANT, label: 'Consultants' },
  { value: UserRole.ETUDIANT, label: 'Étudiants' },
  { value: UserRole.ADMIN, label: 'Administrateurs' },
];

const statusOptions = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'inactive', label: 'Inactifs' },
];

export function AdminUserFilters({
  searchTerm,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  users,
  hasActiveFilters,
  onResetFilters,
  onCreateClick,
  className = '',
}: AdminUserFiltersProps) {
  // Compter les utilisateurs par rôle
  const roleCounts = {
    all: users.length,
    [UserRole.CONSULTANT]: users.filter((u) => u.role === UserRole.CONSULTANT).length,
    [UserRole.ETUDIANT]: users.filter((u) => u.role === UserRole.ETUDIANT).length,
    [UserRole.ADMIN]: users.filter((u) => u.role === UserRole.ADMIN).length,
  };

  const filtersWithCount = roleOptions.map((opt) => ({
    ...opt,
    count: roleCounts[opt.value as keyof typeof roleCounts] || 0,
  }));

  const statusCounts = {
    all: users.length,
    active: users.filter((u) => u.isActive).length,
    inactive: users.filter((u) => !u.isActive).length,
  };

  const statusFiltersWithCount = statusOptions.map((opt) => ({
    ...opt,
    count: statusCounts[opt.value as keyof typeof statusCounts] || 0,
  }));

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SearchInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Rechercher par nom, email..."
          className="flex-1"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCreateClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Nouvel utilisateur</span>
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
        {/* Filtres par rôle */}
        <div className="flex-1">
          <FilterBar
            label="Rôle :"
            filters={filtersWithCount}
            activeFilter={roleFilter}
            onFilterChange={onRoleFilterChange}
          />
        </div>

        {/* Filtres par statut */}
        <div className="flex items-center gap-1.5 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          {statusFiltersWithCount.map((sf) => (
            <button
              key={sf.value}
              type="button"
              onClick={() => onStatusFilterChange(sf.value)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap border ${
                statusFilter === sf.value
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {sf.label} ({sf.count})
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}