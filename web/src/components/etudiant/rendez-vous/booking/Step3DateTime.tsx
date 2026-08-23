'use client';

import React, { useMemo } from 'react';
import { Calendar, Clock, Loader2, Info, AlertCircle, XCircle } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import type { CreateRendezVousFormValues } from '@/src/schemas/rendez-vous.schema';
import { TimeSlot, TIME_SLOT_LABELS } from '@/src/types/enums';

interface Step3DateTimeProps {
  availableSlots: TimeSlot[];
  slotsLoading: boolean;
  todayStr: string;
  isSlotExpired: boolean;
}

export function Step3DateTime({
  availableSlots,
  slotsLoading,
  todayStr,
  isSlotExpired,
}: Step3DateTimeProps) {
  const { register, formState, setValue, watch } = useFormContext<CreateRendezVousFormValues>();
  const fieldErrors = formState.errors;
  const date = watch('date');
  const time = watch('time');

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Date <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            {...register('date')}
            type="date"
            min={todayStr}
            className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-0 focus:border-sky-600 transition-all hover:border-sky-300 ${
              fieldErrors.date ? 'border-red-300' : 'border-slate-300'
            }`}
          />
        </div>
        {fieldErrors.date && (
          <p className="text-[11px] text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {fieldErrors.date.message as string}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Horaire <span className="text-red-500">*</span>
        </label>

        {!date ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <p className="text-xs text-slate-500">Selectionnez d'abord une date</p>
          </div>
        ) : slotsLoading ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
            <span className="ml-2 text-xs text-slate-500">Chargement des creneaux...</span>
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-xs text-amber-700">
              <Info className="w-4 h-4 inline mr-1" />
              Aucun creneau disponible pour cette date
            </p>
            <p className="text-[11px] text-amber-600 mt-1">Essayez une autre date</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1">
            {availableSlots.map((slot) => {
              const isSelected = time === slot;
              const isExpired = (() => {
                if (!date || !slot) return false;
                const now = new Date();
                const slotDate = new Date(date);
                const [hours, minutes] = TIME_SLOT_LABELS[slot].replace('h', '').split('h').map(Number);
                slotDate.setHours(hours || 0, minutes || 0, 0, 0);
                return slotDate < now;
              })();

              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => {
                    if (!isExpired) setValue('time', slot);
                  }}
                  disabled={isExpired}
                  className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                    isSelected
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : isExpired
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300 hover:bg-sky-50'
                  }`}
                >
                  {TIME_SLOT_LABELS[slot]}
                  {isExpired && (
                    <span className="block text-[9px] text-slate-400">depasse</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {fieldErrors.time && (
          <p className="text-[11px] text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {fieldErrors.time.message as string}
          </p>
        )}

        {date && time && isSlotExpired && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Ce creneau horaire est deja passe. Veuillez en selectionner un autre.</p>
          </div>
        )}
      </div>
    </div>
  );
}
