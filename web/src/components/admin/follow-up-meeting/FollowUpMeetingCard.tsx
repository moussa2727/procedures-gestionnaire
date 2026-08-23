'use client';

import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  FileText,
  XCircle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { StatusBadge } from '@/src/components/common';
import { TIME_SLOT_LABELS, MeetingStatus } from '@/src/types/enums';
import type { FollowUpMeetingResponse } from '@/src/types/follow-up-meeting';

interface FollowUpMeetingCardProps {
  meeting: FollowUpMeetingResponse;
  destinationName: string;
  consultantName: string;
  studentName: string;
  procedureNumber: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCancel?: () => void;
  onReschedule?: () => void;
  onComplete?: () => void;
  canModify?: boolean;
  canComplete?: boolean;
  isConsultant?: boolean;
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

export function FollowUpMeetingCard({
  meeting,
  destinationName,
  consultantName,
  studentName,
  procedureNumber,
  isExpanded,
  onToggleExpand,
  onCancel,
  onReschedule,
  onComplete,
  canModify = true,
  canComplete = false,
  isConsultant = false,
  className = '',
}: FollowUpMeetingCardProps) {
  return (
    <div
      className={`bg-white border rounded-2xl p-4 sm:p-5 transition-all ${
        isExpanded ? 'border-sky-400 shadow-sm' : 'border-slate-200 hover:border-sky-300 shadow-sm'
      } ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                #{meeting.id.slice(0, 8)}
              </span>
              <StatusBadge status={meeting.status} type="meeting" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              {isConsultant ? `${studentName} — Dossier #${procedureNumber}` : `Suivi — Dossier #${procedureNumber}`}
            </h3>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
          <div className="text-left sm:text-right">
            <div className="flex items-center sm:justify-end gap-1.5 text-xs font-bold text-slate-900">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>{formatFrenchDate(meeting.date)}</span>
            </div>
            <div className="flex items-center sm:justify-end gap-1.5 text-xs font-semibold text-sky-700 mt-0.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{TIME_SLOT_LABELS[meeting.time] || meeting.time}</span>
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

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
        <div>
          <span className="text-slate-400 block">{isConsultant ? 'Étudiant :' : 'Consultant :'}</span>
          <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{isConsultant ? studentName : consultantName}</span>
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
          <span className="text-slate-400 block">Créé le :</span>
          <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{formatShortDate(meeting.createdAt)}</span>
          </p>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-4 pt-4 border-t border-slate-200 bg-slate-50/80 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5 rounded-b-2xl space-y-4"
          >
            {/* Details grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="space-y-1.5">
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                  Informations du Rendez-vous
                </p>
                <p>
                  <span className="text-slate-400">Date :</span>{' '}
                  <span className="font-semibold text-slate-800">{formatFrenchDate(meeting.date)}</span>
                </p>
                <p>
                  <span className="text-slate-400">Heure :</span>{' '}
                  <span className="font-semibold text-slate-800">{TIME_SLOT_LABELS[meeting.time]}</span>
                </p>
                <p>
                  <span className="text-slate-400">Statut :</span>{' '}
                  <span className="font-semibold">{meeting.status}</span>
                </p>
                <p>
                  <span className="text-slate-400">Créé par :</span>{' '}
                  <span className="font-semibold">{meeting.createdBy}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                  Détails du Dossier
                </p>
                <p>
                  <span className="text-slate-400">Numéro :</span>{' '}
                  <span className="font-semibold text-slate-800">#{procedureNumber}</span>
                </p>
                <p>
                  <span className="text-slate-400">{isConsultant ? 'Étudiant :' : 'Consultant :'}</span>{' '}
                  <span className="font-semibold text-slate-800">{isConsultant ? studentName : consultantName}</span>
                </p>
                <p>
                  <span className="text-slate-400">Destination :</span>{' '}
                  <span className="font-semibold text-slate-800">{destinationName}</span>
                </p>
                {meeting.reason && (
                  <p>
                    <span className="text-slate-400">Motif :</span>{' '}
                    <span className="text-slate-700">{meeting.reason}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            {canModify && meeting.status !== MeetingStatus.CANCELLED && meeting.status !== MeetingStatus.COMPLETED && (
              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-rose-300 hover:text-rose-600 text-slate-700 text-xs font-semibold rounded-lg transition-all"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Annuler</span>
                </button>

                <button
                  type="button"
                  onClick={onReschedule}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Replanifier</span>
                </button>

                {isConsultant && canComplete && onComplete && meeting.status === MeetingStatus.CONFIRMED && (
                  <button
                    type="button"
                    onClick={onComplete}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Marquer Effectué</span>
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}