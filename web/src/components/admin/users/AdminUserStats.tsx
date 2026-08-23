// components/admin/users/AdminUserStats.tsx
'use client';

import { Users, UserCheck, UserX, UserPlus, Clock, Shield, GraduationCap } from 'lucide-react';
import { KPIMetrics } from '@/src/components/common';
import type { UserStatistics } from '@/src/types/user';

interface AdminUserStatsProps {
  stats: UserStatistics;
  className?: string;
}

export function AdminUserStats({ stats, className = '' }: AdminUserStatsProps) {
  const metrics = [
    {
      label: 'Total',
      value: stats.total,
      icon: <Users className="w-3.5 h-3.5" />,
      color: 'text-slate-900',
      bgColor: 'bg-white',
    },
    {
      label: 'Consultants',
      value: stats.byRole.CONSULTANT,
      icon: <Shield className="w-3.5 h-3.5" />,
      color: 'text-sky-700',
      bgColor: 'bg-sky-50/30',
    },
    {
      label: 'Étudiants',
      value: stats.byRole.ETUDIANT,
      icon: <GraduationCap className="w-3.5 h-3.5" />,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50/30',
    },
    {
      label: 'Actifs',
      value: stats.active,
      icon: <UserCheck className="w-3.5 h-3.5" />,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50/30',
    },
    {
      label: 'Inactifs',
      value: stats.inactive,
      icon: <UserX className="w-3.5 h-3.5" />,
      color: 'text-rose-700',
      bgColor: 'bg-rose-50/30',
    },
    {
      label: 'Nouveaux (mois)',
      value: stats.newThisMonth,
      icon: <UserPlus className="w-3.5 h-3.5" />,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50/30',
    },
    {
      label: 'En ligne',
      value: stats.online,
      icon: <Clock className="w-3.5 h-3.5" />,
      color: 'text-sky-700',
      bgColor: 'bg-sky-50/30',
    },
  ];

  return <KPIMetrics metrics={metrics} className={className} />;
}