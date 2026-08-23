// components/admin/contacts/AdminContactStats.tsx
'use client';

import { 
  Mail, 
  Reply, 
  Clock, 
  TrendingUp,
  Layers,
} from 'lucide-react';
import { KPIMetrics } from '@/src/components/common';
import type { ContactStatistics } from '@/src/types/contact';

interface AdminContactStatsProps {
  stats: ContactStatistics;
  className?: string;
}

export function AdminContactStats({ stats, className = '' }: AdminContactStatsProps) {
  const metrics = [
    {
      label: 'Total',
      value: stats.total,
      icon: <Layers className="w-3.5 h-3.5" />,
      color: 'text-slate-900',
      bgColor: 'bg-white',
    },
    {
      label: 'Nouveaux',
      value: stats.unread,
      icon: <Mail className="w-3.5 h-3.5" />,
      color: 'text-sky-700',
      bgColor: 'bg-sky-50/30',
    },
    {
      label: 'En attente',
      value: stats.pending,
      icon: <Clock className="w-3.5 h-3.5" />,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50/30',
    },
    {
      label: 'Répondus',
      value: stats.replied,
      icon: <Reply className="w-3.5 h-3.5" />,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50/30',
    },
    {
      label: 'Taux de réponse',
      value: stats.responseRate,
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      color: 'text-slate-700',
      bgColor: 'bg-slate-50/30',
      suffix: '%',
    },
  ];

  return <KPIMetrics metrics={metrics} className={className} />;
}