'use client';

import { ProcedureCard } from './ProcedureCard';
import { EmptyState, LoadingState } from '@/src/components/common';
import type { ProcedureResponse, StepResponse } from '@/src/types/procedure';

interface ProcedureListProps {
  procedures: ProcedureResponse[];
  isLoading: boolean;
  getDestinationName: (id: string) => string;
  getConsultantName: (id: string) => string;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onUpdateStep?: (procedureId: string, step: StepResponse) => void;
  onComplete?: (procedure: ProcedureResponse) => void;
  onReject?: (procedure: ProcedureResponse) => void;
  onCancel?: (procedure: ProcedureResponse) => void;
  canModify?: boolean;
  isConsultant?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function ProcedureList({
  procedures,
  isLoading,
  getDestinationName,
  getConsultantName,
  expandedId,
  onToggleExpand,
  onUpdateStep,
  onComplete,
  onReject,
  onCancel,
  canModify = true,
  isConsultant = false,
  emptyTitle = 'Aucune procédure trouvée',
  emptyDescription = 'Aucune procédure ne correspond à vos critères.',
  className = '',
}: ProcedureListProps) {
  if (isLoading) {
    return <LoadingState message="Chargement de vos dossiers..." />;
  }

  if (procedures.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={`space-y-3.5 ${className}`}>
      {procedures.map((procedure) => {
        const isExpanded = expandedId === procedure.id;
        const destName = getDestinationName(procedure.destinationId);
        const consultantName = getConsultantName(procedure.consultantId);

        return (
          <ProcedureCard
            key={procedure.id}
            procedure={procedure}
            destinationName={destName}
            consultantName={consultantName}
            isExpanded={isExpanded}
            onToggleExpand={() => onToggleExpand(procedure.id)}
            onUpdateStep={onUpdateStep ? (step) => onUpdateStep(procedure.id, step) : undefined}
            onComplete={onComplete ? () => onComplete(procedure) : undefined}
            onReject={onReject ? () => onReject(procedure) : undefined}
            onCancel={onCancel ? () => onCancel(procedure) : undefined}
            canModify={canModify}
            isConsultant={isConsultant}
          />
        );
      })}
    </div>
  );
}