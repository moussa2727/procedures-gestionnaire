'use client';

import React from 'react';
import { AnimatePresence } from 'motion/react';
import type { RendezVousResponse } from '@/src/types/rendez-vous';
import { Opinion } from '@/src/types/enums';

import { RendezVousCardHeader } from './RendezVousCardHeader';
import { RendezVousCardSummary } from './RendezVousCardSummary';
import { RendezVousCardExpanded } from './RendezVousCardExpanded';

interface RendezVousCardProps {
  rendezVous: RendezVousResponse;
  destinationName: string;
  consultantName: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  renderOpinionBadge?: (opinion?: Opinion | null) => React.ReactNode;
  onComplete?: () => void;
  onOpinion?: () => void;
  onReschedule?: () => void;
  onCancel?: () => void;
  canModify?: boolean;
  isConsultant?: boolean;
  className?: string;
}

export function RendezVousCard({
  rendezVous,
  destinationName,
  consultantName,
  isExpanded,
  onToggleExpand,
  renderOpinionBadge,
  onComplete,
  onOpinion,
  onReschedule,
  onCancel,
  canModify = true,
  isConsultant = false,
  className = '',
}: RendezVousCardProps) {
  return (
    <div
      className={`bg-white border rounded-2xl p-4 sm:p-5 transition-all ${
        isExpanded ? 'border-sky-400 shadow-sm' : 'border-slate-200 hover:border-sky-300 shadow-sm'
      } ${className}`}
    >
      <RendezVousCardHeader
        rendezVous={rendezVous}
        destinationName={destinationName}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        renderOpinionBadge={renderOpinionBadge}
        isConsultant={isConsultant}
      />
      <RendezVousCardSummary
        destinationName={destinationName}
        consultantName={consultantName}
        isConsultant={isConsultant}
        rendezVousFirstName={rendezVous.firstName}
        rendezVousLastName={rendezVous.lastName}
        rendezVousSector={rendezVous.sector}
      />
      <AnimatePresence>
        {isExpanded && (
          <RendezVousCardExpanded
            rendezVous={rendezVous}
            isConsultant={isConsultant}
            canModify={canModify}
            onComplete={onComplete}
            onOpinion={onOpinion}
            onReschedule={onReschedule}
            onCancel={onCancel}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
