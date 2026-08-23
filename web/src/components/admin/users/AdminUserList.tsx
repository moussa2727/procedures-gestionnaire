// components/admin/users/AdminUserList.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { RefreshCw, Users, UserPlus } from 'lucide-react';
import { EmptyState, LoadingState } from '@/src/components/common';
import { AdminUserCard } from './AdminUserCard';
import { AdminUserFilters } from './AdminUserFilters';
import { AdminUserStats } from './AdminUserStats';
import { UserRole } from '@/src/types/enums';
import type { UserResponse, UserStatistics } from '@/src/types/user';

interface AdminUserListProps {
  users: UserResponse[];
  statistics?: UserStatistics | null;
  isLoading: boolean;
  onRefresh: () => void;
  onCreate: () => void;
  onEdit: (user: UserResponse) => void;
  onToggleStatus: (user: UserResponse) => void;
  onPromoteToConsultant: (user: UserResponse) => void;
  onDelete: (user: UserResponse) => void;
  className?: string;
}

type RoleFilter = 'all' | UserRole;
type StatusFilter = 'all' | 'active' | 'inactive';

export function AdminUserList({
  users,
  statistics,
  isLoading,
  onRefresh,
  onCreate,
  onEdit,
  onToggleStatus,
  onPromoteToConsultant,
  onDelete,
  className = '',
}: AdminUserListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filtrage et recherche
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Filtre par rôle
    if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter);
    }

    // Filtre par statut
    if (statusFilter === 'active') {
      result = result.filter((u) => u.isActive);
    } else if (statusFilter === 'inactive') {
      result = result.filter((u) => !u.isActive);
    }

    // Recherche textuelle
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (u) =>
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q) ||
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.phone && u.phone.includes(q))
      );
    }

    // Tri par date de création (plus récents d'abord)
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [users, roleFilter, statusFilter, searchTerm]);

  const hasActiveFilters = searchTerm !== '' || roleFilter !== 'all' || statusFilter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (isLoading) {
    return <LoadingState message="Chargement des utilisateurs..." />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-600" />
            Gestion des utilisateurs
          </h2>
          <p className="text-sm text-slate-500">
            Gérez les comptes consultants, étudiants et administrateurs
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
            <UserPlus className="w-3.5 h-3.5" />
            <span>Nouvel utilisateur</span>
          </button>
        </div>
      </div>

      {/* Statistiques */}
      {statistics && <AdminUserStats stats={statistics} />}

      {/* Filtres */}
      <AdminUserFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        roleFilter={roleFilter}
        onRoleFilterChange={(value) => setRoleFilter(value as RoleFilter)}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => setStatusFilter(value as StatusFilter)}
        users={users}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
        onCreateClick={onCreate}
      />

      {/* Liste */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Utilisateurs</span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
              {filteredUsers.length}
            </span>
          </h3>
        </div>

        {filteredUsers.length === 0 ? (
          <EmptyState
            title={searchTerm ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur'}
            description={
              searchTerm
                ? 'Aucun utilisateur ne correspond à votre recherche.'
                : 'Commencez par créer votre premier utilisateur.'
            }
            action={
              !searchTerm && (
                <button
                  type="button"
                  onClick={onCreate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Créer un utilisateur
                </button>
              )
            }
          />
        ) : (
          filteredUsers.map((user) => (
            <AdminUserCard
              key={user.id}
              user={user}
              isExpanded={expandedId === user.id}
              onToggleExpand={() => toggleExpand(user.id)}
              onEdit={() => onEdit(user)}
              onToggleStatus={() => onToggleStatus(user)}
              onPromoteToConsultant={
                user.role === UserRole.ETUDIANT ? () => onPromoteToConsultant(user) : undefined
              }
              onDelete={() => onDelete(user)}
            />
          ))
        )}
      </div>
    </div>
  );
}