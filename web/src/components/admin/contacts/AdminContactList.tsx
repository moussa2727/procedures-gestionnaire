// components/admin/contacts/AdminContactList.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { RefreshCw, Mail, CheckCircle2, Archive, Reply } from 'lucide-react';
import { EmptyState, LoadingState } from '@/src/components/common';
import { AdminContactCard } from './AdminContactCard';
import { AdminContactFilters } from './AdminContactFilters';
import { AdminContactStats } from './AdminContactStats';
import { ContactStatus } from '@/src/types/enums';
import type { ContactResponse, ContactStatistics } from '@/src/types/contact';

interface AdminContactListProps {
  contacts: ContactResponse[];
  statistics: ContactStatistics | null;
  isLoading: boolean;
  onRefresh: () => void;
  onMarkAsRead: (contact: ContactResponse) => void;
  onMarkAllAsRead: () => void;
  onReply: (contact: ContactResponse) => void;
  onArchive: (contact: ContactResponse) => void;
  onDelete: (contact: ContactResponse) => void;
  className?: string;
}

type StatusFilter = 'all' | ContactStatus;
type DateFilter = 'all' | 'today' | 'week' | 'month';

function getDateRange(filter: DateFilter): Date | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  switch (filter) {
    case 'today':
      return now;
    case 'week': {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return weekAgo;
    }
    case 'month': {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return monthAgo;
    }
    default:
      return null;
  }
}

export function AdminContactList({
  contacts,
  statistics,
  isLoading,
  onRefresh,
  onMarkAsRead,
  onMarkAllAsRead,
  onReply,
  onArchive,
  onDelete,
  className = '',
}: AdminContactListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filtrage et recherche
  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    // Filtre par statut
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Filtre par date
    const dateThreshold = getDateRange(dateFilter);
    if (dateThreshold) {
      result = result.filter((c) => new Date(c.createdAt) >= dateThreshold);
    }

    // Recherche textuelle
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          c.email.toLowerCase().includes(q) ||
          c.message.toLowerCase().includes(q)
      );
    }

    // Tri par date (plus récents d'abord)
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [contacts, statusFilter, dateFilter, searchTerm]);

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || dateFilter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('all');
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Statistiques calculées
  const calculatedStats = useMemo(() => {
    if (statistics) return statistics;
    
    const total = contacts.length;
    const unread = contacts.filter((c) => c.status === ContactStatus.NEW).length;
    const replied = contacts.filter((c) => c.status === ContactStatus.REPLIED).length;
    const pending = contacts.filter((c) => c.status === ContactStatus.READ).length;
    const archived = contacts.filter((c) => c.status === ContactStatus.ARCHIVED).length;
    const responseRate = total > 0 ? Math.round((replied / total) * 100) : 0;

    return {
      total,
      unread,
      replied,
      pending,
      archived,
      responseRate,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      generatedAt: new Date().toISOString(),
    };
  }, [contacts, statistics]);

  if (isLoading) {
    return <LoadingState message="Chargement des messages..." />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-sky-600" />
            Gestion des messages
          </h2>
          <p className="text-sm text-slate-500">
            Consultez et gérez les demandes des visiteurs
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
      <AdminContactStats stats={calculatedStats} />

      {/* Filtres */}
      <AdminContactFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => setStatusFilter(value as StatusFilter)}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        contacts={contacts}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
        onMarkAllAsRead={onMarkAllAsRead}
      />

      {/* Liste */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Messages</span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
              {filteredContacts.length}
            </span>
          </h3>
          {filteredContacts.some((c) => c.status === ContactStatus.NEW) && (
            <span className="text-xs font-medium text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg">
              {filteredContacts.filter((c) => c.status === ContactStatus.NEW).length} non lu(s)
            </span>
          )}
        </div>

        {filteredContacts.length === 0 ? (
          <EmptyState
            title={searchTerm ? 'Aucun message trouvé' : 'Aucun message'}
            description={
              searchTerm
                ? 'Aucun message ne correspond à votre recherche.'
                : 'Aucun message de contact reçu pour le moment.'
            }
            icon={<Mail className="w-7 h-7" />}
          />
        ) : (
          filteredContacts.map((contact) => (
            <AdminContactCard
              key={contact.id}
              contact={contact}
              isExpanded={expandedId === contact.id}
              onToggleExpand={() => toggleExpand(contact.id)}
              onMarkAsRead={() => onMarkAsRead(contact)}
              onReply={() => onReply(contact)}
              onArchive={() => onArchive(contact)}
              onDelete={() => onDelete(contact)}
            />
          ))
        )}
      </div>
    </div>
  );
}