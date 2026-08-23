'use client';

import React from 'react';
import { RendezVousCard } from './RendezVousCard';
import { EmptyState, LoadingState } from '@/src/components/common';
import { Opinion } from '@/src/types/enums';
import type { RendezVousResponse } from '@/src/types/rendez-vous';

interface RendezVousListProps {
  appointments: RendezVousResponse[];
  isLoading: boolean;
  getDestinationName: (id: string) => string;
  getConsultantName: (id: string) => string;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  renderOpinionBadge?: (opinion?: Opinion | null) => React.ReactNode;
  onComplete?: (rv: RendezVousResponse) => void;
  onOpinion?: (rv: RendezVousResponse) => void;
  onReschedule?: (rv: RendezVousResponse) => void;
  onCancel?: (rv: RendezVousResponse) => void;
  canModify?: boolean;
  isConsultant?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function RendezVousList({
  appointments,
  isLoading,
  getDestinationName,
  getConsultantName,
  expandedId,
  onToggleExpand,
  renderOpinionBadge,
  onComplete,
  onOpinion,
  onReschedule,
  onCancel,
  canModify = true,
  isConsultant = false,
  emptyTitle = 'Aucun rendez-vous trouvé',
  emptyDescription = 'Aucun rendez-vous ne correspond à vos critères.',
  className = '',
}: RendezVousListProps) {
  if (isLoading) {
    return <LoadingState message="Chargement de vos rendez-vous..." />;
  }

  if (appointments.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={`space-y-3.5 ${className}`}>
      {appointments.map((rv) => {
        const isExpanded = expandedId === rv.id;
        const destName = getDestinationName(rv.destinationId);
        const consultantName = getConsultantName(rv.consultantId);

        return (
          <RendezVousCard
            key={rv.id}
            rendezVous={rv}
            destinationName={destName}
            consultantName={consultantName}
            isExpanded={isExpanded}
            onToggleExpand={() => onToggleExpand(rv.id)}
            renderOpinionBadge={renderOpinionBadge}
            onComplete={onComplete ? () => onComplete(rv) : undefined}
            onOpinion={onOpinion ? () => onOpinion(rv) : undefined}
            onReschedule={onReschedule ? () => onReschedule(rv) : undefined}
            onCancel={onCancel ? () => onCancel(rv) : undefined}
            canModify={canModify}
            isConsultant={isConsultant}
          />
        );
      })}
    </div>
  );
}