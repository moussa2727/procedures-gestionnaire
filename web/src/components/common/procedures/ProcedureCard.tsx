'use client';

import React from 'react';
import { AnimatePresence } from 'motion/react';
import type { ProcedureResponse, StepResponse } from '@/src/types/procedure';
import { ProcedureStatus } from '@/src/types/enums';

import { ProcedureCardHeader } from './ProcedureCardHeader';
import { ProcedureCardSummary } from './ProcedureCardSummary';
import { ProcedureCardSteps } from './ProcedureCardSteps';

interface ProcedureCardProps {
  procedure: ProcedureResponse;
  destinationName: string;
  consultantName: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateStep?: (step: StepResponse) => void;
  onComplete?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  canModify?: boolean;
  isConsultant?: boolean;
  className?: string;
}

export function ProcedureCard({
  procedure,
  destinationName,
  consultantName,
  isExpanded,
  onToggleExpand,
  onUpdateStep,
  onComplete,
  onReject,
  onCancel,
  canModify = true,
  isConsultant = false,
  className = '',
}: ProcedureCardProps) {
  return (
    <div
      className={`bg-white border rounded-2xl p-4 sm:p-5 transition-all ${
        isExpanded ? 'border-sky-400 shadow-sm' : 'border-slate-200 hover:border-sky-300 shadow-sm'
      } ${className}`}
    >
      <ProcedureCardHeader
        procedure={procedure}
        destinationName={destinationName}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        isConsultant={isConsultant}
        consultantName={consultantName}
      />
      <ProcedureCardSummary
        destinationName={destinationName}
        consultantName={consultantName}
        isConsultant={isConsultant}
        studentId={procedure.studentId}
        steps={procedure.steps || []}
      />
      <AnimatePresence>
        {isExpanded && (
          <ProcedureCardSteps
            steps={procedure.steps || []}
            isExpanded={isExpanded}
            isConsultant={isConsultant}
            canModify={canModify}
            onUpdateStep={onUpdateStep}
            onReject={onReject}
            onComplete={onComplete}
            onCancel={onCancel}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
