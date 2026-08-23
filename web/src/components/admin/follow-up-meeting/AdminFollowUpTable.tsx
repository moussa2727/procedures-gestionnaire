'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  CalendarDays,
  RotateCcw,
  FileText,
} from 'lucide-react';
import { StatusBadge } from '@/src/components/common';
import { TIME_SLOT_LABELS, MeetingStatus } from '@/src/types/enums';
import type { FollowUpMeetingResponse } from '@/src/types/follow-up-meeting';

interface AdminFollowUpTableProps {
  meetings: FollowUpMeetingResponse[];
  getDestinationName: (id: string) => string;
  getConsultantName: (id: string) => string;
  getStudentName: (id: string) => string;
  getProcedureNumber: (id: string) => string;
  onComplete?: (meeting: FollowUpMeetingResponse) => void;
  onReschedule?: (meeting: FollowUpMeetingResponse) => void;
  onCancel?: (meeting: FollowUpMeetingResponse) => void;
  className?: string;
}

function formatFrenchDate(dateStr: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function AdminFollowUpTable({
  meetings,
  getDestinationName,
  getConsultantName,
  getStudentName,
  getProcedureNumber,
  onComplete,
  onReschedule,
  onCancel,
  className = '',
}: AdminFollowUpTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (meetings.length === 0) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl">
        <p className="text-xs text-slate-500">Aucun rendez-vous de suivi à afficher</p>
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
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Date & Heure</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Statut</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {meetings.map((meeting) => {
              const isExpanded = expandedId === meeting.id;
              const canModify = meeting.status === MeetingStatus.PENDING || meeting.status === MeetingStatus.CONFIRMED;
              const canComplete = meeting.status === MeetingStatus.CONFIRMED;

              return (
                <React.Fragment key={meeting.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-slate-900">
                        #{getProcedureNumber(meeting.procedureId)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {meeting.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {getStudentName(meeting.studentId)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {getConsultantName(meeting.consultantId)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{formatFrenchDate(meeting.date)}</div>
                      <div className="text-[10px] text-sky-600">{TIME_SLOT_LABELS[meeting.time]}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={meeting.status} type="meeting" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canComplete && onComplete && (
                          <button
                            type="button"
                            onClick={() => onComplete(meeting)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Marquer effectué"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {canModify && onReschedule && (
                          <button
                            type="button"
                            onClick={() => onReschedule(meeting)}
                            className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                            title="Replanifier"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}

                        {canModify && onCancel && (
                          <button
                            type="button"
                            onClick={() => onCancel(meeting)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Annuler"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : meeting.id)}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded row */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <td colSpan={6} className="px-4 py-3 bg-slate-50/80">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div className="space-y-1">
                              <span className="font-semibold text-slate-700 block">Détails</span>
                              <p className="text-slate-600">
                                <span className="text-slate-400">Créé par :</span> {meeting.createdBy}
                              </p>
                              <p className="text-slate-600">
                                <span className="text-slate-400">Créé le :</span> {formatFrenchDate(meeting.createdAt)}
                              </p>
                              {meeting.reason && (
                                <p className="text-slate-600">
                                  <span className="text-slate-400">Motif :</span> {meeting.reason}
                                </p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <span className="font-semibold text-slate-700 block">Destination</span>
                              <p className="text-slate-600 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {getDestinationName(
                                  // On récupère la destination depuis la procédure
                                  // Dans un cas réel, on aurait cette info directement
                                  meeting.procedureId
                                )}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="font-semibold text-slate-700 block">Statut actuel</span>
                              <StatusBadge status={meeting.status} type="meeting" />
                            </div>
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