'use client';

import React from 'react';
import { User, MapPin, Layers } from 'lucide-react';

interface ProcedureCardSummaryProps {
  destinationName: string;
  consultantName: string;
  isConsultant?: boolean;
  studentId?: string;
  steps?: { status: string }[];
}

export function ProcedureCardSummary({
  destinationName,
  consultantName,
  isConsultant = false,
  studentId,
  steps = [],
}: ProcedureCardSummaryProps) {
  const completedSteps = steps.filter((s) => s.status === 'COMPLETED').length;
  const totalSteps = steps.length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
      <div>
        <span className="text-slate-400 block">{isConsultant ? 'Étudiant :' : 'Consultant :'}</span>
        <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5 truncate">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{isConsultant ? `#${studentId?.slice(0, 8) || 'N/A'}` : consultantName}</span>
        </p>
      </div>
      <div>
        <span className="text-slate-400 block">Destination :</span>
        <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{destinationName}</span>
        </p>
      </div>
      <div>
        <span className="text-slate-400 block">Étapes :</span>
        <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{completedSteps}/{totalSteps} validées</span>
        </p>
      </div>
    </div>
  );
}
