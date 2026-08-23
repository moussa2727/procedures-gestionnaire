// components/admin/dashboard/AdminDashboardStats.tsx
'use client';

import React from 'react';
import {
  Calendar,
  FileText,
  Users,
  Mail,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  Layers,
  Building2,
  UserCheck,
  UserPlus,
  Reply,
} from 'lucide-react';
import { KPIMetrics } from '@/src/components/common';

export interface DashboardStats {
  rendezvous: {
    total: number;
    today: number;
    pending: number;
    completed: number;
    cancelled: number;
    confirmed: number;
  };
  procedures: {
    total: number;
    inProgress: number;
    completed: number;
    rejected: number;
    cancelled: number;
  };
  users: {
    total: number;
    consultants: number;
    students: number;
    admins: number;
    active: number;
    newThisMonth: number;
  };
  contacts: {
    total: number;
    unread: number;
    replied: number;
    pending: number;
  };
  destinations: {
    total: number;
    active: number;
    archived: number;
    withConsultants: number;
  };
  followups: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
}

interface AdminDashboardStatsProps {
  stats: DashboardStats;
  isLoading?: boolean;
  className?: string;
}

export function AdminDashboardStats({ stats, isLoading = false, className = '' }: AdminDashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-pulse"
          >
            <div className="h-4 w-20 bg-slate-200 rounded mb-3" />
            <div className="h-8 w-16 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // KPI principaux
  const mainMetrics = [
    {
      label: 'Rendez-vous',
      value: stats.rendezvous.total,
      icon: <Calendar className="w-3.5 h-3.5" />,
      color: 'text-slate-900',
      bgColor: 'bg-white',
      detail: (
        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            {stats.rendezvous.completed} réalisés
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-500" />
            {stats.rendezvous.pending} en attente
          </span>
        </div>
      ),
    },
    {
      label: 'Procédures',
      value: stats.procedures.total,
      icon: <FileText className="w-3.5 h-3.5" />,
      color: 'text-slate-900',
      bgColor: 'bg-white',
      detail: (
        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-sky-500" />
            {stats.procedures.inProgress} en cours
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            {stats.procedures.completed} terminées
          </span>
        </div>
      ),
    },
    {
      label: 'Utilisateurs',
      value: stats.users.total,
      icon: <Users className="w-3.5 h-3.5" />,
      color: 'text-slate-900',
      bgColor: 'bg-white',
      detail: (
        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-emerald-500" />
            {stats.users.active} actifs
          </span>
          <span className="flex items-center gap-1">
            <UserPlus className="w-3 h-3 text-sky-500" />
            +{stats.users.newThisMonth} ce mois
          </span>
        </div>
      ),
    },
    {
      label: 'Messages',
      value: stats.contacts.total,
      icon: <Mail className="w-3.5 h-3.5" />,
      color: 'text-slate-900',
      bgColor: 'bg-white',
      detail: (
        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
          <span className="flex items-center gap-1 text-rose-500">
            <Mail className="w-3 h-3" />
            {stats.contacts.unread} non lus
          </span>
          <span className="flex items-center gap-1">
            <Reply className="w-3 h-3 text-emerald-500" />
            {stats.contacts.replied} répondus
          </span>
        </div>
      ),
    },
  ];

  // Métriques secondaires
  const secondaryMetrics = [
    {
      label: 'Rendez-vous aujourd\'hui',
      value: stats.rendezvous.today,
      icon: <Calendar className="w-3.5 h-3.5" />,
      color: 'text-sky-700',
      bgColor: 'bg-sky-50/30',
    },
    {
      label: 'Destinations',
      value: stats.destinations.total,
      icon: <Building2 className="w-3.5 h-3.5" />,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50/30',
      detail: (
        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
          <span className="text-emerald-600">{stats.destinations.active} actives</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-400">{stats.destinations.archived} archivées</span>
        </div>
      ),
    },
    {
      label: 'Suivis',
      value: stats.followups.total,
      icon: <Clock className="w-3.5 h-3.5" />,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50/30',
      detail: (
        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
          <span className="text-amber-600">{stats.followups.pending} en attente</span>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-600">{stats.followups.completed} effectués</span>
        </div>
      ),
    },
    {
      label: 'Consultants',
      value: stats.users.consultants,
      icon: <UserCheck className="w-3.5 h-3.5" />,
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-50/30',
    },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <KPIMetrics metrics={mainMetrics} />
      <KPIMetrics metrics={secondaryMetrics} />
    </div>
  );
}