'use client';

import { ThumbsUp, ThumbsDown, HelpCircle, Clock3 } from 'lucide-react';
import { Opinion } from '@/src/types/enums';

interface OpinionBadgeProps {
  opinion?: Opinion | null;
  className?: string;
  showLabel?: boolean;
}

const opinionConfigs = {
  [Opinion.FAVORABLE]: {
    label: 'Avis Favorable',
    icon: ThumbsUp,
    color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    iconColor: 'text-emerald-700',
  },
  [Opinion.UNFAVORABLE]: {
    label: 'Avis Défavorable',
    icon: ThumbsDown,
    color: 'bg-rose-50 text-rose-800 border-rose-300',
    iconColor: 'text-rose-700',
  },
  [Opinion.PENDING]: {
    label: 'Évaluation en cours',
    icon: Clock3,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    iconColor: 'text-slate-500',
  },
};

export function OpinionBadge({ opinion, className = '', showLabel = true }: OpinionBadgeProps) {
  if (!opinion) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 ${className}`}
      >
        <HelpCircle className="w-3 h-3 text-slate-400" />
        Sans avis
      </span>
    );
  }

  const config = opinionConfigs[opinion];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${config.color} ${className}`}
    >
      <Icon className={`w-3 h-3 ${config.iconColor}`} />
      {showLabel && config.label}
    </span>
  );
}