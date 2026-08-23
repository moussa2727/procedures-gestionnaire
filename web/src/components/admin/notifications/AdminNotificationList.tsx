// components/admin/notifications/AdminNotificationList.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { RefreshCw, Bell, Inbox } from 'lucide-react';
import { EmptyState, LoadingState } from '@/src/components/common';
import { AdminNotificationCard } from './AdminNotificationCard';
import { AdminNotificationFilters } from './AdminNotificationFilters';
import { NotificationType } from '@/src/types/enums';
import type { NotificationResponse } from '@/src/types/notification';

interface AdminNotificationListProps {
  notifications: NotificationResponse[];
  isLoading: boolean;
  onRefresh: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigate?: (entityId?: string | null, entity?: string | null) => void;
  className?: string;
}

type TypeFilter = 'all' | NotificationType | 'RENDEZVOUS' | 'PROCEDURE' | 'FOLLOWUP' | 'DESTINATION' | 'CONTACT' | 'REVIEW' | 'ACCOUNT' | 'SYSTEM';
type StatusFilter = 'all' | 'unread' | 'read';

export function AdminNotificationList({
  notifications,
  isLoading,
  onRefresh,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigate,
  className = '',
}: AdminNotificationListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Filtrage et recherche
  const filteredNotifications = useMemo(() => {
    let result = [...notifications];

    // Filtre par type
    if (typeFilter !== 'all') {
      if (typeFilter === 'RENDEZVOUS') {
        result = result.filter((n) => n.type.includes('RENDEZVOUS'));
      } else if (typeFilter === 'PROCEDURE') {
        result = result.filter((n) => n.type.includes('PROCEDURE'));
      } else if (typeFilter === 'FOLLOWUP') {
        result = result.filter((n) => n.type.includes('FOLLOWUP'));
      } else if (typeFilter === 'DESTINATION') {
        result = result.filter((n) => n.type.includes('DESTINATION'));
      } else if (typeFilter === 'CONTACT') {
        result = result.filter((n) => n.type.includes('CONTACT'));
      } else if (typeFilter === 'REVIEW') {
        result = result.filter((n) => n.type.includes('REVIEW'));
      } else if (typeFilter === 'ACCOUNT') {
        result = result.filter((n) => n.type.includes('ACCOUNT'));
      } else {
        result = result.filter((n) => n.type === typeFilter);
      }
    }

    // Filtre par statut
    if (statusFilter === 'unread') {
      result = result.filter((n) => !n.isRead);
    } else if (statusFilter === 'read') {
      result = result.filter((n) => n.isRead);
    }

    // Recherche textuelle
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          (n.entity && n.entity.toLowerCase().includes(q))
      );
    }

    // Tri par date (plus récents d'abord)
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notifications, typeFilter, statusFilter, searchTerm]);

  const hasActiveFilters = searchTerm !== '' || typeFilter !== 'all' || statusFilter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setStatusFilter('all');
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (isLoading) {
    return <LoadingState message="Chargement des notifications..." />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-sky-600" />
            Notifications
          </h2>
          <p className="text-sm text-slate-500">
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Toutes les notifications sont lues'}
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

      {/* Filtres */}
      <AdminNotificationFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        typeFilter={typeFilter}
        onTypeFilterChange={(value) => setTypeFilter(value as TypeFilter)}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => setStatusFilter(value as StatusFilter)}
        notifications={notifications}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
        onMarkAllAsRead={unreadCount > 0 ? onMarkAllAsRead : undefined}
      />

      {/* Liste */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Notifications</span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
              {filteredNotifications.length}
            </span>
          </h3>
          {unreadCount > 0 && (
            <span className="text-xs font-medium text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {filteredNotifications.length === 0 ? (
          <EmptyState
            title={searchTerm ? 'Aucune notification trouvée' : 'Aucune notification'}
            description={
              searchTerm
                ? 'Aucune notification ne correspond à votre recherche.'
                : 'Vous êtes à jour ! Toutes les notifications sont lues.'
            }
            icon={<Inbox className="w-7 h-7" />}
          />
        ) : (
          filteredNotifications.map((notification) => (
            <AdminNotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
              onNavigate={onNavigate}
            />
          ))
        )}
      </div>
    </div>
  );
}