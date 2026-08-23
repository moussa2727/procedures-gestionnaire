'use client';

import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Info, XCircle as XCircleIcon, CheckCircle2 as CheckCircle2Icon, Shield } from 'lucide-react';
import type { StepResponse } from '@/src/types/procedure';
import { StepStatus, ProcedureStatus } from '@/src/types/enums';

interface ProcedureCardStepsProps {
  steps: StepResponse[];
  isExpanded: boolean;
  isConsultant?: boolean;
  canModify?: boolean;
  onUpdateStep?: (step: StepResponse) => void;
  onReject?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
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

export function ProcedureCardSteps({
  steps,
  isExpanded,
  isConsultant = false,
  canModify = true,
  onUpdateStep,
  onReject,
  onComplete,
  onCancel,
}: ProcedureCardStepsProps) {
  const status = ProcedureStatus.IN_PROGRESS;
  const canComplete = status === ProcedureStatus.IN_PROGRESS && steps.filter((s) => s.status === StepStatus.COMPLETED).length === steps.length;
  const canReject = status === ProcedureStatus.IN_PROGRESS;
  const canCancel = status === ProcedureStatus.IN_PROGRESS;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      className="mt-4 pt-4 border-t border-slate-200 bg-slate-50/80 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5 rounded-b-2xl space-y-4"
    >
      <div>
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          Étapes de la procédure
        </h4>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-2.5 bg-white rounded-lg border ${
                status === ProcedureStatus.IN_PROGRESS && (step.status === StepStatus.PENDING || step.status === StepStatus.IN_PROGRESS)
                  ? 'border-sky-200 hover:border-sky-300'
                  : 'border-slate-200'
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
                    {isConsultant && status === ProcedureStatus.IN_PROGRESS &&
                      (step.status === StepStatus.PENDING || step.status === StepStatus.IN_PROGRESS) &&
                      onUpdateStep && (
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
          ))}
        </div>
      </div>

      {canModify && status === ProcedureStatus.IN_PROGRESS && (
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Dossier en cours de traitement</span>
          </div>

          <div className="flex items-center gap-2">
            {isConsultant && canCancel && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-rose-300 hover:text-rose-600 text-slate-700 text-xs font-semibold rounded-lg transition-all"
              >
                <XCircleIcon className="w-3.5 h-3.5" />
                <span>Annuler</span>
              </button>
            )}

            {isConsultant && canReject && onReject && (
              <button
                type="button"
                onClick={onReject}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-red-300 hover:text-red-600 text-slate-700 text-xs font-semibold rounded-lg transition-all"
              >
                <XCircleIcon className="w-3.5 h-3.5" />
                <span>Rejeter</span>
              </button>
            )}

            {isConsultant && canComplete && onComplete && (
              <button
                type="button"
                onClick={onComplete}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
              >
                <CheckCircle2Icon className="w-3.5 h-3.5" />
                <span>Terminer la procédure</span>
              </button>
            )}
          </div>
        </div>
      )}

      {!isConsultant && canCancel && onCancel && status === ProcedureStatus.IN_PROGRESS && (
        <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-rose-300 hover:text-rose-600 text-slate-700 text-xs font-semibold rounded-lg transition-all"
          >
            <XCircleIcon className="w-3.5 h-3.5" />
            <span>Annuler la procédure</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}
