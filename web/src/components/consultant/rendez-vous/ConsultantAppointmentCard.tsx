'use client';

import React from 'react';
import { Calendar, Clock, User, MapPin, ChevronDown, ChevronUp, CheckCircle2, XCircle, CalendarDays, FileCheck2, GraduationCap, Briefcase, Mail, Phone } from 'lucide-react';
import { StatusBadge, OpinionBadge } from '@/src/components/common';
import { TIME_SLOT_LABELS, RendezvousStatus, Opinion, TimeSlot } from '@/src/types/enums';
import type { RendezVousResponse } from '@/src/types/rendez-vous';

interface ConsultantAppointmentCardProps {
  rendezVous: RendezVousResponse;
  getDestinationName: (id: string) => string;
  getConsultantName: (id: string) => string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onComplete: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  onOpinion: () => void;
  isPending?: boolean;
}

export function ConsultantAppointmentCard({
  rendezVous,
  getDestinationName,
  getConsultantName,
  isExpanded,
  onToggleExpand,
  onComplete,
  onReschedule,
  onCancel,
  onOpinion,
  isPending,
}: ConsultantAppointmentCardProps) {
  const destName = getDestinationName(rendezVous.destinationId);
  const isActionable = rendezVous.status === RendezvousStatus.CONFIRMED;
  const showOpinion = rendezVous.status === RendezvousStatus.COMPLETED;

  return (
    <div
      className={`bg-white border rounded-2xl p-5 transition-all shadow-xs ${
        isExpanded ? 'border-sky-300 shadow-sm' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm shrink-0">
            {rendezVous.firstName[0]}{rendezVous.lastName[0]}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {rendezVous.firstName} {rendezVous.lastName}
              </h3>
              <StatusBadge status={rendezVous.status} type="rendezvous" />
              <OpinionBadge opinion={rendezVous.opinion} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                {formatFrenchDate(rendezVous.date)} a {TIME_SLOT_LABELS[rendezVous.time as TimeSlot] || rendezVous.time}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {destName}
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {getConsultantName(rendezVous.consultantId)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          {isActionable && (
            <>
              <button
                type="button"
                onClick={onComplete}
                disabled={isPending}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Marquer Realise</span>
              </button>
              <button
                type="button"
                onClick={onReschedule}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5"
              >
                <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                <span>Replanifier</span>
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 bg-white hover:bg-red-50 border border-slate-300 hover:border-red-200 text-slate-600 hover:text-red-700 text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Annuler</span>
              </button>
            </>
          )}

          {showOpinion && (
            <button
              type="button"
              onClick={onOpinion}
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-sky-600" />
              <span>{rendezVous.opinion ? "Modifier l'Avis" : "Rediger l'Avis"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleExpand}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Details du dossier"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 border border-slate-200">
            <span className="font-bold text-slate-900 block uppercase tracking-wider text-[10px]">
              Profil Academique
            </span>
            <div className="space-y-1 text-slate-600">
              <div className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="font-medium">Niveau :</span> {rendezVous.studyLevel}
              </div>
              <div className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="font-medium">Filiere :</span> {rendezVous.sector}
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="font-medium">Cible :</span> {destName}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 border border-slate-200">
            <span className="font-bold text-slate-900 block uppercase tracking-wider text-[10px]">
              Coordonnees Candidat
            </span>
            <div className="space-y-1 text-slate-600">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <a href={`mailto:${rendezVous.email}`} className="text-sky-700 hover:underline">
                  {rendezVous.email}
                </a>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <a href={`tel:${rendezVous.phone}`} className="text-slate-800 hover:underline">
                  {rendezVous.phone}
                </a>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Cree le {formatShortDate(rendezVous.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                Avis & Preconisations
              </span>
              <OpinionBadge opinion={rendezVous.opinion} />
            </div>
            {(rendezVous as any).opinionNotes || (rendezVous as any).notes ? (
              <p className="text-slate-700 italic text-[11px] leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                &laquo; {(rendezVous as any).opinionNotes || (rendezVous as any).notes} &raquo;
              </p>
            ) : rendezVous.status === RendezvousStatus.CANCELLED ? (
              <p className="text-red-700 text-[11px]">
                <span className="font-semibold">Motif d'annulation :</span>{' '}
                {(rendezVous as any).cancelReason || (rendezVous as any).reason || 'Non specifie'}
              </p>
            ) : (
              <p className="text-slate-400 text-[11px] italic">
                Aucun avis academique enregistre pour l'instant.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatFrenchDate(dateStr: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
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
