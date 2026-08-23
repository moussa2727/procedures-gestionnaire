'use client';

import { Layers, Calendar, Clock3, CheckCircle, XCircle, ThumbsUp } from 'lucide-react';
import { KPIMetrics } from '@/src/components/common';

interface AdminStatsCardsProps {
  stats: {
    total: number;
    confirmed?: number;
    pending?: number;
    completed: number;
    cancelled: number;
    inProgress?: number;
    rejected?: number;
    favorable?: number;
    unfavorable?: number;
  };
  type: 'rendezvous' | 'procedure' | 'followup';
  className?: string;
}

const statConfigs = {
  rendezvous: {
    metrics: (stats: any) => [
      { label: 'Total', value: stats.total, icon: <Layers className="w-3.5 h-3.5" />, color: 'text-slate-900', bgColor: 'bg-white' },
      { label: 'Confirmés', value: stats.confirmed || 0, icon: <Calendar className="w-3.5 h-3.5" />, color: 'text-sky-700', bgColor: 'bg-sky-50/30' },
      { label: 'Réalisés', value: stats.completed, icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-emerald-700', bgColor: 'bg-emerald-50/30' },
      { label: 'En attente', value: stats.pending || 0, icon: <Clock3 className="w-3.5 h-3.5" />, color: 'text-amber-700', bgColor: 'bg-amber-50/30' },
      { label: 'Annulés', value: stats.cancelled, icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-red-700', bgColor: 'bg-red-50/30' },
      { label: 'Avis Favorables', value: stats.favorable || 0, icon: <ThumbsUp className="w-3.5 h-3.5" />, color: 'text-emerald-700', bgColor: 'bg-emerald-50/30' },
    ],
  },
  procedure: {
    metrics: (stats: any) => [
      { label: 'Total', value: stats.total, icon: <Layers className="w-3.5 h-3.5" />, color: 'text-slate-900', bgColor: 'bg-white' },
      { label: 'En cours', value: stats.inProgress || 0, icon: <Clock3 className="w-3.5 h-3.5" />, color: 'text-sky-700', bgColor: 'bg-sky-50/30' },
      { label: 'Terminées', value: stats.completed, icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-emerald-700', bgColor: 'bg-emerald-50/30' },
      { label: 'Rejetées', value: stats.rejected || 0, icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-red-700', bgColor: 'bg-red-50/30' },
      { label: 'Annulées', value: stats.cancelled, icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-slate-600', bgColor: 'bg-slate-50/30' },
    ],
  },
  followup: {
    metrics: (stats: any) => [
      { label: 'Total', value: stats.total, icon: <Layers className="w-3.5 h-3.5" />, color: 'text-slate-900', bgColor: 'bg-white' },
      { label: 'En attente', value: stats.pending || 0, icon: <Clock3 className="w-3.5 h-3.5" />, color: 'text-amber-700', bgColor: 'bg-amber-50/30' },
      { label: 'Confirmés', value: stats.confirmed || 0, icon: <Calendar className="w-3.5 h-3.5" />, color: 'text-sky-700', bgColor: 'bg-sky-50/30' },
      { label: 'Effectués', value: stats.completed, icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-emerald-700', bgColor: 'bg-emerald-50/30' },
      { label: 'Annulés', value: stats.cancelled, icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-red-700', bgColor: 'bg-red-50/30' },
    ],
  },
};

export function AdminStatsCards({ stats, type, className = '' }: AdminStatsCardsProps) {
  const config = statConfigs[type];
  if (!config) return null;

  const metrics = config.metrics(stats);

  return <KPIMetrics metrics={metrics} className={className} />;
}