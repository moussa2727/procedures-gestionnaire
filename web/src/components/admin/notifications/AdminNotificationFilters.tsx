// components/admin/notifications/AdminNotificationFilters.tsx
'use client';

import React from 'react';
import { Search, X, Filter, Bell, CheckCircle, Clock, Calendar, FileText, Users, Mail } from 'lucide-react';
import { SearchInput, FilterBar } from '@/src/components/common';
import { NotificationType } from '@/src/types/enums';
import type { NotificationResponse } from '@/src/types/notification';

interface AdminNotificationFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  notifications: NotificationResponse[];
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onMarkAllAsRead?: () => void;
  className?: string;
}

const typeOptions = [
  { value: 'all', label: 'Tous' },
  { value: NotificationType.RENDEZVOUS_CREATED, label: 'Rendez-vous' },
  { value: NotificationType.PROCEDURE_CREATED, label: 'Procédures' },
  { value: NotificationType.FOLLOWUP_CREATED, label: 'Suivis' },
  { value: NotificationType.DESTINATION_CREATED, label: 'Destinations' },
  { value: NotificationType.CONTACT_NEW, label: 'Messages' },
  { value: NotificationType.REVIEW_RECEIVED, label: 'Avis' },
  { value: NotificationType.ACCOUNT_PROMOTED, label: 'Utilisateurs' },
  { value: NotificationType.SYSTEM, label: 'Système' },
];

const statusOptions = [
  { value: 'all', label: 'Tous' },
  { value: 'unread', label: 'Non lus' },
  { value: 'read', label: 'Lus' },
];

export function AdminNotificationFilters({
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  notifications,
  hasActiveFilters,
  onResetFilters,
  onMarkAllAsRead,
  className = '',
}: AdminNotificationFiltersProps) {
  // Compter les notifications par type
  const typeCounts = {
    all: notifications.length,
    [NotificationType.RENDEZVOUS_CREATED]: notifications.filter((n) => n.type.includes('RENDEZVOUS')).length,
    [NotificationType.PROCEDURE_CREATED]: notifications.filter((n) => n.type.includes('PROCEDURE')).length,
    [NotificationType.FOLLOWUP_CREATED]: notifications.filter((n) => n.type.includes('FOLLOWUP')).length,
    [NotificationType.DESTINATION_CREATED]: notifications.filter((n) => n.type.includes('DESTINATION')).length,
    [NotificationType.CONTACT_NEW]: notifications.filter((n) => n.type.includes('CONTACT')).length,
    [NotificationType.REVIEW_RECEIVED]: notifications.filter((n) => n.type.includes('REVIEW')).length,
    [NotificationType.ACCOUNT_PROMOTED]: notifications.filter((n) => n.type.includes('ACCOUNT')).length,
    [NotificationType.SYSTEM]: notifications.filter((n) => n.type === NotificationType.SYSTEM).length,
  };

  const filtersWithCount = typeOptions.map((opt) => ({
    ...opt,
    count: typeCounts[opt.value as keyof typeof typeCounts] || 0,
  }));

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const hasUnread = unreadCount > 0;

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SearchInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Rechercher dans les notifications..."
          className="flex-1"
        />

        <div className="flex items-center gap-2">
          {hasUnread && onMarkAllAsRead && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-xl transition-colors border border-sky-200"
            >
              <CheckCircle className="w-3.5 h-3.5" />
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
        {/* Filtres par type */}
        <div className="flex-1">
          <FilterBar
            label="Type :"
            filters={filtersWithCount}
            activeFilter={typeFilter}
            onFilterChange={onTypeFilterChange}
          />
        </div>

        {/* Filtres par statut */}
        <div className="flex items-center gap-1.5 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          {statusOptions.map((sf) => (
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
              {sf.label}
              {sf.value === 'unread' && unreadCount > 0 && (
                <span className="ml-1 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}