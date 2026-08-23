'use client';

import { CheckCircle2, XCircle, LucideIcon } from 'lucide-react';
import { RendezvousStatus, MeetingStatus, ProcedureStatus, StepStatus } from '@/src/types/enums';

type StatusType = RendezvousStatus | MeetingStatus | ProcedureStatus | StepStatus;

interface StatusBadgeProps {
  status: StatusType;
  type: 'rendezvous' | 'meeting' | 'procedure' | 'step';
  className?: string;
  showIcon?: boolean;
}

interface StatusItemConfig {
  label: string;
  color: string;
  icon: LucideIcon | null;
}

const statusConfigs: Record<StatusBadgeProps['type'], Record<string, StatusItemConfig>> = {
  rendezvous: {
    [RendezvousStatus.CONFIRMED]: { label: 'Confirmé', color: 'bg-sky-50 text-sky-700 border-sky-200', icon: null },
    [RendezvousStatus.PENDING]: { label: 'En attente', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: null },
    [RendezvousStatus.COMPLETED]: { label: 'Terminé', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    [RendezvousStatus.CANCELLED]: { label: 'Annulé', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  },
  meeting: {
    [MeetingStatus.PENDING]: { label: 'En attente', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: null },
    [MeetingStatus.CONFIRMED]: { label: 'Confirmé', color: 'bg-sky-50 text-sky-700 border-sky-200', icon: null },
    [MeetingStatus.COMPLETED]: { label: 'Effectué', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    [MeetingStatus.CANCELLED]: { label: 'Annulé', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  },
  procedure: {
    [ProcedureStatus.IN_PROGRESS]: { label: 'En cours', color: 'bg-sky-50 text-sky-700 border-sky-200', icon: null },
    [ProcedureStatus.COMPLETED]: { label: 'Terminée', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    [ProcedureStatus.REJECTED]: { label: 'Rejetée', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
    [ProcedureStatus.CANCELLED]: { label: 'Annulée', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: XCircle },
  },
  step: {
    [StepStatus.PENDING]: { label: 'En attente', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: null },
    [StepStatus.IN_PROGRESS]: { label: 'En cours', color: 'bg-sky-50 text-sky-700 border-sky-200', icon: null },
    [StepStatus.COMPLETED]: { label: 'Validée', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    [StepStatus.REJECTED]: { label: 'Rejetée', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  },
};

export function StatusBadge({ status, type, className = '', showIcon = true }: StatusBadgeProps) {
  const config = statusConfigs[type]?.[status as string];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${config.color} ${className}`}
    >
      {showIcon && Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
}