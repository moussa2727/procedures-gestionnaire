// components/admin/destinations/AdminDestinationStats.tsx
'use client';

import { Building2, CheckCircle, XCircle, PlusCircle, Layers } from 'lucide-react';
import { KPIMetrics } from '@/src/components/common';

interface AdminDestinationStatsProps {
  stats: {
    total: number;
    active: number;
    archived: number;
    withConsultants: number;
    withoutConsultants: number;
  };
  className?: string;
}

export function AdminDestinationStats({ stats, className = '' }: AdminDestinationStatsProps) {
  const metrics = [
    {
      label: 'Total',
      value: stats.total,
      icon: <Layers className="w-3.5 h-3.5" />,
      color: 'text-slate-900',
      bgColor: 'bg-white',
    },
    {
      label: 'Actives',
      value: stats.active,
      icon: <Building2 className="w-3.5 h-3.5" />,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50/30',
    },
    {
      label: 'Archivées',
      value: stats.archived,
      icon: <XCircle className="w-3.5 h-3.5" />,
      color: 'text-slate-500',
      bgColor: 'bg-slate-50/30',
    },
    {
      label: 'Avec consultants',
      value: stats.withConsultants,
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      color: 'text-sky-700',
      bgColor: 'bg-sky-50/30',
    },
    {
      label: 'Sans consultant',
      value: stats.withoutConsultants,
      icon: <PlusCircle className="w-3.5 h-3.5" />,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50/30',
    },
  ];

  return <KPIMetrics metrics={metrics} className={className} />;
}