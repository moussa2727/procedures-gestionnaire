// components/common/NextAppointmentHero.tsx
'use client';

import React from 'react';
import { Calendar, Clock, RotateCcw, XCircle, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { TIME_SLOT_LABELS, MeetingStatus, RendezvousStatus } from '@/src/types/enums';

export interface NextAppointmentHeroProps {
  /** Type de rendez‑vous : 'rendezvous' ou 'followup' */
  type: 'rendezvous' | 'followup';
  /** Titre principal (ex: "Entretien d'orientation — Canada") */
  title: string;
  /** Sous‑titre (ex: "Consultant : Dr. Sophie Laurent" ou "Étudiant : Jean Dupont") */
  subtitle?: string;
  /** Date au format YYYY-MM-DD */
  date: string;
  /** Horaire (TimeSlot) */
  time: string;
  /** Statut du rendez‑vous ou du suivi */
  status: MeetingStatus | RendezvousStatus;
  /** Texte indiquant le délai (ex: "Aujourd'hui", "Dans 3 jours") */
  daysUntil: string;
  /** Indique si l'utilisateur peut modifier le rendez‑vous */
  canModify: boolean;
  /** Indique si le consultant peut marquer comme effectué (uniquement pour les rendez‑vous confirmés) */
  canComplete?: boolean;
  /** Callback pour replanifier */
  onReschedule?: () => void;
  /** Callback pour annuler */
  onCancel?: () => void;
  /** Callback pour marquer comme effectué (consultant) */
  onComplete?: () => void;
  /** Badge supplémentaire (optionnel) */
  extraBadge?: React.ReactNode;
  /** Classe CSS supplémentaire */
  className?: string;
}

/**
 * Formatte une date au format français lisible
 */
function formatFrenchDate(dateStr: string): string {
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

export function NextAppointmentHero({
  type,
  title,
  subtitle,
  date,
  time,
  status,
  daysUntil,
  canModify,
  canComplete = false,
  onReschedule,
  onCancel,
  onComplete,
  extraBadge,
  className = '',
}: NextAppointmentHeroProps) {
  const isConfirmed = status === RendezvousStatus.CONFIRMED || status === MeetingStatus.CONFIRMED;
  const isPending = status === RendezvousStatus.PENDING || status === MeetingStatus.PENDING;
  const isActive = isConfirmed || isPending;

  return (
    <div
      className={`p-5 sm:p-6 bg-slate-900 text-white rounded-2xl shadow-md border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden ${className}`}
    >
      {/* Décoration d'arrière-plan */}
      <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="space-y-3 z-10">
        {/* En‑tête avec badge "Prochain Imminent" et délai */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-400 text-slate-950 uppercase tracking-wide">
            Prochain {type === 'rendezvous' ? 'Entretien' : 'Suivi'} Imminent
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-sky-200">
            <Clock className="w-3 h-3" />
            {daysUntil}
          </span>
          {/* Afficher le badge de statut */}
          <StatusBadge status={status} type={type === 'rendezvous' ? 'rendezvous' : 'meeting'} />
          {extraBadge}
        </div>

        {/* Titre et sous‑titre */}
        <div>
          <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>{title}</span>
          </h3>
          {subtitle && (
            <p className="text-xs text-sky-200 mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Date et heure */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
            <Calendar className="w-3.5 h-3.5 text-sky-300" />
            <span className="font-semibold text-white">{formatFrenchDate(date)}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
            <Clock className="w-3.5 h-3.5 text-sky-300" />
            <span className="font-semibold text-white">
              {TIME_SLOT_LABELS[time as keyof typeof TIME_SLOT_LABELS] || time}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {canModify && isActive && (
        <div className="flex flex-wrap items-center gap-2.5 z-10 shrink-0">
          {/* Bouton "Marquer Effectué" (consultant uniquement) */}
          {canComplete && onComplete && isConfirmed && (
            <button
              type="button"
              onClick={onComplete}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Marquer Effectué</span>
            </button>
          )}

          {/* Replanifier */}
          {onReschedule && (
            <button
              type="button"
              onClick={onReschedule}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Déplacer</span>
            </button>
          )}

          {/* Annuler */}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition-all"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Annuler</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default NextAppointmentHero;