'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { TimeSlot, TIME_SLOT_LABELS } from '@/src/types/enums';

interface RescheduleModalFormProps {
  todayStr: string;
  newDate: string;
  newTime: TimeSlot;
  onDateChange: (date: string) => void;
  onTimeChange: (time: TimeSlot) => void;
  availableSlots: TimeSlot[];
  isPending: boolean;
}

export function RescheduleModalForm({
  todayStr,
  newDate,
  newTime,
  onDateChange,
  onTimeChange,
  availableSlots,
  isPending,
}: RescheduleModalFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Nouvelle Date <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="date"
            min={todayStr}
            value={newDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-sky-600"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Nouvel Horaire <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
          {availableSlots.map((slot) => {
            const isSelected = newTime === slot;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => onTimeChange(slot)}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                  isSelected
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300'
                }`}
              >
                {TIME_SLOT_LABELS[slot]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
