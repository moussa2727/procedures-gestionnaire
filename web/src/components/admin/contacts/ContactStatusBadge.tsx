// components/contacts/ContactStatusBadge.tsx
'use client';

import { Mail, CheckCircle2, Reply, Archive, Clock } from 'lucide-react';
import { ContactStatus } from '@/src/types/enums';

interface ContactStatusBadgeProps {
  status: ContactStatus;
  className?: string;
  showLabel?: boolean;
}

const statusConfigs = {
  [ContactStatus.NEW]: {
    label: 'Nouveau',
    icon: Mail,
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    iconColor: 'text-sky-600',
  },
  [ContactStatus.READ]: {
    label: 'Lu',
    icon: CheckCircle2,
    color: 'bg-slate-50 text-slate-700 border-slate-200',
    iconColor: 'text-slate-500',
  },
  [ContactStatus.REPLIED]: {
    label: 'Répondu',
    icon: Reply,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconColor: 'text-emerald-600',
  },
  [ContactStatus.ARCHIVED]: {
    label: 'Archivé',
    icon: Archive,
    color: 'bg-slate-100 text-slate-600 border-slate-200',
    iconColor: 'text-slate-400',
  },
};

export function ContactStatusBadge({ status, className = '', showLabel = true }: ContactStatusBadgeProps) {
  const config = statusConfigs[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color} ${className}`}
    >
      <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
      {showLabel && config.label}
    </span>
  );
}