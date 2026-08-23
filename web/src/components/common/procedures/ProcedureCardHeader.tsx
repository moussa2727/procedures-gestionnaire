'use client';

import React from 'react';
import { FileText, Calendar, User, MapPin, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { StatusBadge } from '@/src/components/common';
import { StepStatus } from '@/src/types/enums';
import type { ProcedureResponse } from '@/src/types/procedure';

interface ProcedureCardHeaderProps {
  procedure: ProcedureResponse;
  destinationName: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isConsultant?: boolean;
  consultantName?: string;
}

function formatShortDate(dateStr: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getProgress(steps: ProcedureResponse['steps']) {
  if (!steps || steps.length === 0) return 0;
  const completed = steps.filter((s) => s.status === StepStatus.COMPLETED).length;
  return Math.round((completed / steps.length) * 100);
}

export function ProcedureCardHeader({
  procedure,
  destinationName,
  isExpanded,
  onToggleExpand,
  isConsultant = false,
  consultantName,
}: ProcedureCardHeaderProps) {
  const progress = getProgress(procedure.steps);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              #{procedure.numeroDossier}
            </span>
            <StatusBadge status={procedure.status} type="procedure" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-1">
            Procédure — {destinationName}
          </h3>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
        <div className="text-left sm:text-right">
          <div className="flex items-center sm:justify-end gap-1.5 text-xs font-medium text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Créée le {formatShortDate(procedure.createdAt)}</span>
          </div>
          <div className="flex items-center sm:justify-end gap-1.5 text-xs font-semibold text-sky-700 mt-0.5">
            <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-sky-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span>{progress}%</span>
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
