'use client';

import React from 'react';
import { CalendarDays, ChevronDown, ChevronUp, Calendar, Clock } from 'lucide-react';
import { StatusBadge } from '@/src/components/common';
import { TIME_SLOT_LABELS } from '@/src/types/enums';
import { Opinion } from '@/src/types/enums';
import type { RendezVousResponse } from '@/src/types/rendez-vous';

interface RendezVousCardHeaderProps {
  rendezVous: RendezVousResponse;
  destinationName: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  renderOpinionBadge?: (opinion?: Opinion | null) => React.ReactNode;
  isConsultant?: boolean;
}

export function RendezVousCardHeader({
  rendezVous,
  destinationName,
  isExpanded,
  onToggleExpand,
  renderOpinionBadge,
  isConsultant = false,
}: RendezVousCardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shrink-0">
          <CalendarDays className="w-5 h-5" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              #{rendezVous.id.slice(0, 8)}
            </span>
            <StatusBadge status={rendezVous.status} type="rendezvous" />
            {renderOpinionBadge && renderOpinionBadge(rendezVous.opinion)}
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-1">
            {isConsultant ? `${rendezVous.firstName} ${rendezVous.lastName}` : `Entretien — ${destinationName}`}
          </h3>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
        <div className="text-left sm:text-right">
          <div className="flex items-center sm:justify-end gap-1.5 text-xs font-bold text-slate-900">
            <Calendar className="w-3.5 h-3.5 text-sky-600" />
            <span>{formatFrenchDate(rendezVous.date)}</span>
          </div>
          <div className="flex items-center sm:justify-end gap-1.5 text-xs font-semibold text-sky-700 mt-0.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{TIME_SLOT_LABELS[rendezVous.time] || rendezVous.time}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleExpand}
          className="p-2 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-slate-50 text-slate-600 transition-all shrink-0"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function formatFrenchDate(dateStr: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}
