'use client';

import React from 'react';
import { Calendar, MapPin, User, Eye, XCircle, CalendarClock } from 'lucide-react';
import { StatusBadge, OpinionBadge } from '@/src/components/common';
import { TIME_SLOT_LABELS, RendezvousStatus } from '@/src/types/enums';
import type { RendezVousResponse } from '@/src/types/rendez-vous';
import type { ConsultantSemiPublicProfile } from '@/src/types/user';
import type { DestinationResponse } from '@/src/types/destination';

interface MesRendezVousCardProps {
  rendezVous: RendezVousResponse;
  destinationName: string;
  consultantName: string;
  statusConfig: { color: string; label: string };
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCancel?: () => void;
  onReschedule?: () => void;
  isActionable?: boolean;
  isPast?: boolean;
}

export function MesRendezVousCard({
  rendezVous,
  destinationName,
  consultantName,
  statusConfig,
  isExpanded,
  onToggleExpand,
  onCancel,
  onReschedule,
  isActionable = false,
  isPast = false,
}: MesRendezVousCardProps) {
  return (
    <div
      className={`bg-white border rounded-xl p-4 sm:p-5 transition-all ${
        isPast ? 'border-slate-200 opacity-75' : 'border-slate-200 hover:border-sky-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <StatusBadge status={rendezVous.status} type="rendezvous" />
            <span className="text-xs text-slate-400">
              {formatFrenchDate(rendezVous.date)} a {TIME_SLOT_LABELS[rendezVous.time]}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5 text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {destinationName}
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {consultantName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-2 text-slate-400 hover:text-sky-600 transition-colors rounded-lg hover:bg-sky-50"
            aria-label="Voir les details"
          >
            <Eye className="w-4 h-4" />
          </button>

          {isActionable && !isPast && (
            <>
              <button
                type="button"
                onClick={onReschedule}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
              >
                <CalendarClock className="w-3.5 h-3.5" />
                Replanifier
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Annuler
              </button>
            </>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <DetailItem label="Nom complet" value={`${rendezVous.firstName} ${rendezVous.lastName}`} />
            <DetailItem label="Email" value={rendezVous.email} />
            <DetailItem label="Telephone" value={rendezVous.phone} />
            <DetailItem label="Secteur" value={rendezVous.sector} />
            <DetailItem label="Niveau d'etudes" value={rendezVous.studyLevel} />
            <DetailItem label="Statut" value={<StatusBadge status={rendezVous.status} type="rendezvous" />} />
            {rendezVous.cancellationReason && (
              <DetailItem label="Motif d'annulation" value={rendezVous.cancellationReason} className="text-red-600" />
            )}
            {rendezVous.opinion && (
              <DetailItem label="Avis consultant" value={<OpinionBadge opinion={rendezVous.opinion} />} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div>
      <span className="text-slate-500">{label} :</span>
      <span className={`ml-2 text-slate-700 font-medium ${className}`}>{value}</span>
    </div>
  );
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
