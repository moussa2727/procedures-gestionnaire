'use client';

import { useQuery } from '@tanstack/react-query';
import { LoadingState, KPIMetrics } from '@/src/components/common';
import { userService } from '@/src/services/user.service';
import type { UserStatistics } from '@/src/types/user';
import { Clock, TrendingUp, Users, User, UserCheck, UserX } from 'lucide-react';

export default function ConsultantMesStatistiquesPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['consultant-stats'],
    queryFn: async () => {
      const res = await userService.getStatistics();
      return res as UserStatistics;
    },
  });

  if (isLoading) {
    return <LoadingState message="Chargement des statistiques..." />;
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-600">Erreur lors du chargement des statistiques</p>
      </div>
    );
  }

  const metrics = [
    {
      label: 'Total étudiants',
      value: stats?.byRole?.ETUDIANT || 0,
      icon: <Users className="w-4 h-4" />,
      color: 'text-sky-700',
      bgColor: 'bg-sky-50',
    },
    {
      label: 'Total consultants',
      value: stats?.byRole?.CONSULTANT || 0,
      icon: <User className="w-4 h-4" />,
      color: 'text-sky-700',
      bgColor: 'bg-sky-50',
    },
    {
      label: 'Total admins',
      value: stats?.byRole?.ADMIN || 0,
      icon: <UserCheck className="w-4 h-4" />,
      color: 'text-sky-700',
      bgColor: 'bg-sky-50',
    },
    {
      label: 'Actifs',
      value: stats?.active || 0,
      icon: <UserCheck className="w-4 h-4" />,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Inactifs',
      value: stats?.inactive || 0,
      icon: <UserX className="w-4 h-4" />,
      color: 'text-red-700',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Consultant</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Mes statistiques</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Vue d&apos;ensemble des utilisateurs et de l&apos;activité de la plateforme.
        </p>
      </header>

      <KPIMetrics metrics={metrics} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <TrendingUp className="w-4 h-4 text-sky-600" />
            Nouveaux ce mois
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats?.newThisMonth || 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Clock className="w-4 h-4 text-sky-600" />
            Nouveaux cette semaine
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats?.newThisWeek || 0}</p>
        </div>
      </div>
    </section>
  );
}
