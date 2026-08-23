'use client';


import { CheckCircle2, XCircle } from 'lucide-react';
import { StepStatus } from '@/src/types/enums';
import type { StepResponse } from '@/src/types/procedure';

interface ProcedureStepsProps {
  steps: StepResponse[];
  onUpdateStep?: (step: StepResponse) => void;
  canModify?: boolean;
  className?: string;
}

function renderStepStatusBadge(status: StepStatus) {
  switch (status) {
    case StepStatus.PENDING:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1 h-1 rounded-full bg-amber-500" />
          En attente
        </span>
      );
    case StepStatus.IN_PROGRESS:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
          <span className="w-1 h-1 rounded-full bg-sky-500 animate-pulse" />
          En cours
        </span>
      );
    case StepStatus.COMPLETED:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
          Validée
        </span>
      );
    case StepStatus.REJECTED:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
          <XCircle className="w-2.5 h-2.5 text-red-600" />
          Rejetée
        </span>
      );
    default:
      return null;
  }
}

export function ProcedureSteps({ steps, onUpdateStep, canModify = false, className = '' }: ProcedureStepsProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className={`text-center py-8 text-xs text-slate-500 ${className}`}>
        Aucune étape définie pour cette procédure.
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {steps.map((step, index) => {
        const canModifyStep = canModify && (step.status === StepStatus.PENDING || step.status === StepStatus.IN_PROGRESS);

        return (
          <div
            key={step.id}
            className={`flex items-start gap-3 p-2.5 bg-white rounded-lg border ${
              canModifyStep ? 'border-sky-200 hover:border-sky-300' : 'border-slate-200'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-xs font-medium text-slate-800 truncate">{step.stepName}</span>
                <div className="flex items-center gap-1.5">
                  {renderStepStatusBadge(step.status)}
                  {canModifyStep && onUpdateStep && (
                    <button
                      type="button"
                      onClick={() => onUpdateStep(step)}
                      className="px-2 py-0.5 text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
                    >
                      Modifier
                    </button>
                  )}
                </div>
              </div>
              {step.rejectionReason && step.status === StepStatus.REJECTED && (
                <p className="text-[11px] text-red-600 mt-1">
                  <span className="font-medium">Motif :</span> {step.rejectionReason}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}