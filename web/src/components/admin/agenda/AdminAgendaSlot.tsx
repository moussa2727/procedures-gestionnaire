// components/admin/agenda/AdminAgendaSlot.tsx
'use client';

import { Clock, User, MapPin, CheckCircle2, XCircle, Calendar, Mail, Phone } from 'lucide-react';
import { TIME_SLOT_LABELS, TimeSlot, RendezvousStatus } from '@/src/types/enums';
import type { RendezVousResponse } from '@/src/types/rendez-vous';

interface AdminAgendaSlotProps {
  time: TimeSlot;
  appointment: RendezVousResponse | null;
  consultantName?: string;
  destinationName?: string;
  onViewAppointment?: (appointment: RendezVousResponse) => void;
  onComplete?: (appointment: RendezVousResponse) => void;
  onCancel?: (appointment: RendezVousResponse) => void;
  className?: string;
}

function getStatusBadge(status: RendezvousStatus) {
  switch (status) {
    case RendezvousStatus.CONFIRMED:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-600 animate-pulse" />
          Confirmé
        </span>
      );
    case RendezvousStatus.PENDING:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          En attente
        </span>
      );
    case RendezvousStatus.COMPLETED:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Réalisé
        </span>
      );
    case RendezvousStatus.CANCELLED:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
          <XCircle className="w-3 h-3 text-red-600" />
          Annulé
        </span>
      );
    default:
      return null;
  }
}

export function AdminAgendaSlot({
  time,
  appointment,
  consultantName,
  destinationName,
  onViewAppointment,
  onComplete,
  onCancel,
  className = '',
}: AdminAgendaSlotProps) {
  const timeLabel = TIME_SLOT_LABELS[time] || time;
  const isOccupied = !!appointment;
  const isCompleted = appointment?.status === RendezvousStatus.COMPLETED;
  const isCancelled = appointment?.status === RendezvousStatus.CANCELLED;
  const isConfirmed = appointment?.status === RendezvousStatus.CONFIRMED;

  return (
    <div
      className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3.5 rounded-xl border transition-colors ${
        isOccupied
          ? isCompleted
            ? 'bg-emerald-50/40 border-emerald-200'
            : isCancelled
            ? 'bg-red-50/40 border-red-200'
            : 'bg-sky-50/40 border-sky-200'
          : 'bg-slate-50/50 border-slate-200 border-dashed'
      } ${className}`}
    >
      {/* Heure */}
      <div className="w-16 shrink-0 flex items-center gap-1.5">
        <Clock className={`w-4 h-4 ${isOccupied ? 'text-sky-600' : 'text-slate-400'}`} />
        <span className={`text-xs font-bold ${isOccupied ? 'text-slate-800' : 'text-slate-400'}`}>
          {timeLabel}
        </span>
      </div>

      {/* Contenu */}
      {isOccupied ? (
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                {appointment.firstName} {appointment.lastName}
              </span>
              {getStatusBadge(appointment.status)}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
              {destinationName && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {destinationName}
                </span>
              )}
              {consultantName && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {consultantName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {appointment.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {appointment.phone}
              </span>
            </div>
            {appointment.sector && (
              <span className="text-[10px] font-medium text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {appointment.sector} • {appointment.studyLevel}
              </span>
            )}
          </div>

          {/* Actions rapides */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isConfirmed && onComplete && (
              <button
                type="button"
                onClick={() => onComplete(appointment)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold rounded-lg transition-colors flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Valider</span>
              </button>
            )}
            {isConfirmed && onCancel && (
              <button
                type="button"
                onClick={() => onCancel(appointment)}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-semibold rounded-lg transition-colors flex items-center gap-1"
              >
                <XCircle className="w-3 h-3" />
                <span>Annuler</span>
              </button>
            )}
            {onViewAppointment && (
              <button
                type="button"
                onClick={() => onViewAppointment(appointment)}
                className="px-2.5 py-1 bg-white border border-slate-300 hover:border-sky-300 text-slate-700 text-[10px] font-semibold rounded-lg transition-colors flex items-center gap-1"
              >
                <Calendar className="w-3 h-3" />
                <span>Détails</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 text-xs text-slate-400 italic">
          Créneau libre / aucun entretien planifié
        </div>
      )}
    </div>
  );
}