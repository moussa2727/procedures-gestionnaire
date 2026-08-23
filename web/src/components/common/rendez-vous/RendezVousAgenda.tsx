'use client';

import React from 'react';
import { Calendar, Clock, CheckCircle2, FileCheck2 } from 'lucide-react';
import { StatusBadge } from '@/src/components/common';
import { TIME_SLOT_LABELS, RendezvousStatus, TimeSlot } from '@/src/types/enums';
import type { RendezVousResponse } from '@/src/types/rendez-vous';
import { OpinionBadge } from '@/src/components/common';

interface RendezVousAgendaProps {
  agendaSlots: Record<TimeSlot, RendezVousResponse | null>;
  agendaDate: string;
  onDateChange: (date: string) => void;
  getDestinationName: (id: string) => string;
  renderStatusBadge?: (status: RendezvousStatus) => React.ReactNode;
  renderOpinionBadge?: (opinion?: any) => React.ReactNode;
  onComplete?: (appt: RendezVousResponse) => void;
  onOpinion?: (appt: RendezVousResponse) => void;
  isConsultant?: boolean;
  className?: string;
}

export function RendezVousAgenda({
  agendaSlots,
  agendaDate,
  onDateChange,
  getDestinationName,
  renderStatusBadge,
  renderOpinionBadge,
  onComplete,
  onOpinion,
  isConsultant = false,
  className = '',
}: RendezVousAgendaProps) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-sky-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Agenda Quotidien des Consultations</h2>
            <p className="text-xs text-slate-500">Vue créneau par créneau pour la journée sélectionnée</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="agenda-date-picker" className="text-xs font-semibold text-slate-600">
            Date :
          </label>
          <input
            id="agenda-date-picker"
            type="date"
            value={agendaDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-600"
          />
        </div>
      </div>

      {/* Timeline Slots */}
      <div className="space-y-3">
        {(Object.entries(agendaSlots) as [TimeSlot, RendezVousResponse | null][]).map(([slotKey, appt]) => {
          const timeLabel = TIME_SLOT_LABELS[slotKey] || slotKey;

          return (
            <div
              key={slotKey}
              className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 rounded-xl border transition-colors ${
                appt
                  ? 'bg-sky-50/40 border-sky-200'
                  : 'bg-slate-50/50 border-slate-200 border-dashed text-slate-400'
              }`}
            >
              {/* Time pill */}
              <div className="w-24 shrink-0 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold text-slate-800">{timeLabel}</span>
              </div>

              {/* Content */}
              {appt ? (
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {appt.firstName} {appt.lastName}
                      </span>
                      {renderStatusBadge ? renderStatusBadge(appt.status) : (
                        <StatusBadge status={appt.status} type="rendezvous" />
                      )}
                      {renderOpinionBadge ? renderOpinionBadge(appt.opinion) : (
                        <OpinionBadge opinion={appt.opinion} />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {appt.sector} • {getDestinationName(appt.destinationId)} •{' '}
                      <span className="text-slate-700 font-medium">{appt.phone}</span>
                    </p>
                  </div>

                  {/* Quick action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isConsultant && appt.status === RendezvousStatus.CONFIRMED && onComplete && (
                      <button
                        type="button"
                        onClick={() => onComplete(appt)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Valider Entretien</span>
                      </button>
                    )}

                    {isConsultant && appt.status === RendezvousStatus.COMPLETED && onOpinion && (
                      <button
                        type="button"
                        onClick={() => onOpinion(appt)}
                        className="px-2.5 py-1 bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-semibold rounded-lg hover:bg-sky-100 transition-colors flex items-center gap-1"
                      >
                        <FileCheck2 className="w-3 h-3 text-sky-600" />
                        <span>Avis</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">Créneau libre / aucun entretien planifié</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}