'use client';

import React from 'react';
import { motion } from 'motion/react';
import { User, Mail, Phone, GraduationCap, Calendar, Clock, XCircle, FileCheck2, CheckCircle2, RotateCcw, XCircle as XCircleIcon } from 'lucide-react';
import { TIME_SLOT_LABELS, RendezvousStatus } from '@/src/types/enums';
import type { RendezVousResponse } from '@/src/types/rendez-vous';

interface RendezVousCardExpandedProps {
  rendezVous: RendezVousResponse;
  isConsultant?: boolean;
  canModify?: boolean;
  onComplete?: () => void;
  onOpinion?: () => void;
  onReschedule?: () => void;
  onCancel?: () => void;
}

function formatFrenchDate(dateStr: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

function formatShortDate(dateStr: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function RendezVousCardExpanded({
  rendezVous,
  isConsultant = false,
  canModify = true,
  onComplete,
  onOpinion,
  onReschedule,
  onCancel,
}: RendezVousCardExpandedProps) {
  const isCancelled = rendezVous.status === RendezvousStatus.CANCELLED;
  const isCompleted = rendezVous.status === RendezvousStatus.COMPLETED;
  const isConfirmed = rendezVous.status === RendezvousStatus.CONFIRMED;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      className="mt-4 pt-4 border-t border-slate-200 bg-slate-50/80 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5 rounded-b-2xl space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="space-y-1.5">
          <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
            Informations Candidat
          </p>
          <p className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>{rendezVous.firstName} {rendezVous.lastName}</span>
          </p>
          <p className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>{rendezVous.email}</span>
          </p>
          <p className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{rendezVous.phone}</span>
          </p>
          <p className="flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
            <span>{rendezVous.studyLevel}</span>
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
            Détails de l&apos;Entretien
          </p>
          <p>
            <span className="text-slate-400">Date :</span>{' '}
            <span className="font-semibold text-slate-800">{formatFrenchDate(rendezVous.date)}</span>
          </p>
          <p>
            <span className="text-slate-400">Heure :</span>{' '}
            <span className="font-semibold text-slate-800">{TIME_SLOT_LABELS[rendezVous.time]}</span>
          </p>
          <p>
            <span className="text-slate-400">Statut :</span>{' '}
            <span className="font-semibold">{rendezVous.status}</span>
          </p>
          <p>
            <span className="text-slate-400">Créé le :</span>{' '}
            <span>{formatShortDate(rendezVous.createdAt)}</span>
          </p>
        </div>
      </div>

      {isCancelled && rendezVous.cancellationReason && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <p className="font-semibold flex items-center gap-1.5">
            <XCircle className="w-4 h-4" />
            Motif d&apos;annulation :
          </p>
          <p className="mt-1">{rendezVous.cancellationReason}</p>
        </div>
      )}

      {canModify && !isCancelled && (
        <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200">
          {isConfirmed && (
            <>
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-rose-300 hover:text-rose-600 text-slate-700 text-xs font-semibold rounded-lg transition-all"
              >
                <XCircleIcon className="w-3.5 h-3.5" />
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

              {isConsultant && onComplete && (
                <button
                  type="button"
                  onClick={onComplete}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Marquer Réalisé</span>
                </button>
              )}
            </>
          )}

          {isCompleted && isConsultant && onOpinion && (
            <button
              type="button"
              onClick={onOpinion}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-semibold rounded-lg transition-all"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-sky-600" />
              <span>{rendezVous.opinion ? 'Modifier l\'Avis' : 'Rédiger l\'Avis'}</span>
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
