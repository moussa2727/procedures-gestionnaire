// components/admin/agenda/AdminAgendaFilters.tsx
'use client';

import { Calendar, User, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ConsultantSemiPublicProfile } from '@/src/types/user';

interface AdminAgendaFiltersProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  selectedConsultantId: string;
  onConsultantChange: (consultantId: string) => void;
  consultants: ConsultantSemiPublicProfile[];
  onRefresh: () => void;
  className?: string;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getDayOffset(dateStr: string, offset: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
}

export function AdminAgendaFilters({
  selectedDate,
  onDateChange,
  selectedConsultantId,
  onConsultantChange,
  consultants,
  onRefresh,
  className = '',
}: AdminAgendaFiltersProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${className}`}>
      {/* Navigation date */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onDateChange(getDayOffset(selectedDate, -1))}
          className="p-2 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="relative">
          <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="pl-10 pr-3.5 py-2 bg-white border border-slate-300 hover:border-sky-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-sky-600 transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={() => onDateChange(getDayOffset(selectedDate, 1))}
          className="p-2 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {!isToday(selectedDate) && (
          <button
            type="button"
            onClick={() => onDateChange(todayStr)}
            className="px-3 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50 rounded-xl transition-colors border border-sky-200 hover:border-sky-300"
          >
            Aujourd'hui
          </button>
        )}

        <span className="text-xs font-medium text-slate-500 ml-1">
          {formatDateDisplay(selectedDate)}
          {isToday(selectedDate) && (
            <span className="ml-1 text-sky-600 font-bold">• Aujourd'hui</span>
          )}
        </span>
      </div>

      {/* Filtres consultants */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <User className="w-4 h-4 text-slate-400" />
          <select
            value={selectedConsultantId}
            onChange={(e) => onConsultantChange(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-sky-600 cursor-pointer min-w-37.5"
          >
            <option value="all">Tous les consultants</option>
            {consultants.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Actualiser"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}