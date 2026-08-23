'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  User,
  MapPin,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  FileText,
  Layers,
  Clock3,
} from 'lucide-react';
import { StatusBadge } from '@/src/components/common';
import { ProcedureStatus, StepStatus } from '@/src/types/enums';
import type { ProcedureResponse } from '@/src/types/procedure';

interface AdminProcedureTableProps {
  procedures: ProcedureResponse[];
  getDestinationName: (id: string) => string;
  getConsultantName: (id: string) => string;
  getStudentName: (id: string) => string;
  onComplete?: (procedure: ProcedureResponse) => void;
  onReject?: (procedure: ProcedureResponse) => void;
  onCancel?: (procedure: ProcedureResponse) => void;
  onUpdateStep?: (procedure: ProcedureResponse, step: any) => void;
  className?: string;
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

function getProgress(steps: any[] = []) {
  if (!steps || steps.length === 0) return 0;
  const completed = steps.filter((s) => s.status === StepStatus.COMPLETED).length;
  return Math.round((completed / steps.length) * 100);
}

export function AdminProcedureTable({
  procedures,
  getDestinationName,
  getConsultantName,
  getStudentName,
  onComplete,
  onReject,
  onCancel,
  onUpdateStep,
  className = '',
}: AdminProcedureTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (procedures.length === 0) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl">
        <p className="text-xs text-slate-500">Aucune procédure à afficher</p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Dossier</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Étudiant</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Consultant</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Destination</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Progression</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Statut</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {procedures.map((procedure) => {
              const isExpanded = expandedId === procedure.id;
              const progress = getProgress(procedure.steps);
              const canModify = procedure.status === ProcedureStatus.IN_PROGRESS;

              return (
                <React.Fragment key={procedure.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-slate-900">
                        #{procedure.numeroDossier}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatShortDate(procedure.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {getStudentName(procedure.studentId)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {getConsultantName(procedure.consultantId)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {getDestinationName(procedure.destinationId)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-600 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-slate-600">{progress}%</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {procedure.steps?.filter((s) => s.status === StepStatus.COMPLETED).length || 0}/
                        {procedure.steps?.length || 0} étapes
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={procedure.status} type="procedure" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canModify && onComplete && (
                          <button
                            type="button"
                            onClick={() => onComplete(procedure)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Terminer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {canModify && onReject && (
                          <button
                            type="button"
                            onClick={() => onReject(procedure)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Rejeter"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        {canModify && onCancel && (
                          <button
                            type="button"
                            onClick={() => onCancel(procedure)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Annuler"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : procedure.id)}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded row with steps */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <td colSpan={7} className="px-4 py-3 bg-slate-50/80">
                          <div className="space-y-3">
                            <span className="font-semibold text-slate-700 block text-xs">Étapes :</span>
                            <div className="space-y-1.5">
                              {procedure.steps?.map((step, index) => (
                                <div
                                  key={step.id}
                                  className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200"
                                >
                                  <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">
                                    {index + 1}
                                  </div>
                                  <span className="text-xs font-medium text-slate-800 flex-1">
                                    {step.stepName}
                                  </span>
                                  <StatusBadge status={step.status} type="step" />
                                  {canModify && onUpdateStep && (
                                    <button
                                      type="button"
                                      onClick={() => onUpdateStep(procedure, step)}
                                      className="px-2 py-0.5 text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
                                    >
                                      Modifier
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            {procedure.cancellationReason && (
                              <p className="text-xs text-rose-600 mt-2">
                                <span className="font-medium">Motif annulation :</span> {procedure.cancellationReason}
                              </p>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}