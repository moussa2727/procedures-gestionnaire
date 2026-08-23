'use client';

import React, { useMemo } from 'react';
import { MapPin, User, Info, AlertCircle } from 'lucide-react';
import { useFormContext, Controller } from 'react-hook-form';
import type { CreateRendezVousFormValues } from '@/src/schemas/rendez-vous.schema';
import type { DestinationResponse } from '@/src/types/destination';

interface Step2DestinationConsultantProps {
  destinations: DestinationResponse[];
  consultants: any[];
  consultantsLoading: boolean;
}

export function Step2DestinationConsultant({
  destinations,
  consultants,
  consultantsLoading,
}: Step2DestinationConsultantProps) {
  const { register, formState, setValue, watch } = useFormContext<CreateRendezVousFormValues>();
  const fieldErrors = formState.errors;
  const destinationId = watch('destinationId');

  const selectedDestination = useMemo(
    () => destinations.find((d) => d.id === destinationId),
    [destinations, destinationId]
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Destination <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            {...register('destinationId')}
            onChange={(e) => {
              setValue('consultantId', '');
              register('destinationId').onChange(e);
            }}
            className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-0 focus:border-sky-600 transition-all appearance-none hover:border-sky-300 ${
              fieldErrors.destinationId ? 'border-red-300 hover:border-red-300' : 'border-slate-300'
            }`}
          >
            <option value="">Selectionnez une destination</option>
            {destinations.map((dest) => (
              <option key={dest.id} value={dest.id}>
                {dest.country}
              </option>
            ))}
          </select>
        </div>
        {fieldErrors.destinationId && (
          <p className="text-[11px] text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {fieldErrors.destinationId.message as string}
          </p>
        )}
        {destinations.length === 0 && (
          <p className="text-[11px] text-amber-600 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Aucune destination disponible pour le moment
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Consultant <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            {...register('consultantId')}
            disabled={!destinationId || consultantsLoading}
            className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-0 focus:border-sky-600 transition-all appearance-none hover:border-sky-300 ${
              !destinationId || consultantsLoading ? 'opacity-60 cursor-not-allowed hover:border-slate-300' : ''
            } ${
              fieldErrors.consultantId ? 'border-red-300 hover:border-red-300' : 'border-slate-300'
            }`}
          >
            <option value="">
              {consultantsLoading
                ? 'Chargement des consultants...'
                : !destinationId
                ? 'Selectionnez d\'abord une destination'
                : 'Selectionnez un consultant'}
            </option>
            {consultants.map((consultant: any) => (
              <option key={consultant.id} value={consultant.id}>
                {consultant.firstName} {consultant.lastName}
              </option>
            ))}
          </select>
        </div>
        {fieldErrors.consultantId && (
          <p className="text-[11px] text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {fieldErrors.consultantId.message as string}
          </p>
        )}
        {destinationId && consultants.length === 0 && !consultantsLoading && (
          <p className="text-[11px] text-amber-600 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Aucun consultant disponible pour cette destination
          </p>
        )}
      </div>

      {selectedDestination && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-xs font-semibold text-slate-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-600" />
            Destination selectionnee
          </p>
          <p className="text-sm font-bold text-slate-900 mt-1">
            {selectedDestination.country || '—'}
          </p>
        </div>
      )}
    </div>
  );
}
