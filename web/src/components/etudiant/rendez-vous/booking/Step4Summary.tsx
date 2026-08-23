'use client';

import React from 'react';
import { MapPin, Calendar, Clock, CheckCircle2, Info } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import type { CreateRendezVousFormValues } from '@/src/schemas/rendez-vous.schema';
import type { DestinationResponse } from '@/src/types/destination';
import { TIME_SLOT_LABELS, TimeSlot } from '@/src/types/enums';

interface Step4SummaryProps {
  destinations: DestinationResponse[];
  consultants: any[];
}

export function Step4Summary({ destinations, consultants }: Step4SummaryProps) {
  const { watch } = useFormContext<CreateRendezVousFormValues>();
  const values = watch();
  const destination = destinations.find((d) => d.id === values.destinationId);
  const consultant = consultants.find((c: any) => c.id === values.consultantId);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        <p className="text-xs text-emerald-800 font-medium">
          Verifiez toutes les informations avant de confirmer votre rendez-vous
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
        <div className="space-y-2">
          <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
            Informations personnelles
          </p>
          <div>
            <span className="text-slate-400">Nom complet</span>
            <p className="font-semibold text-slate-900">
              {values.firstName} {values.lastName}
            </p>
          </div>
          <div>
            <span className="text-slate-400">Email</span>
            <p className="font-semibold text-slate-900">{values.email}</p>
          </div>
          <div>
            <span className="text-slate-400">Telephone</span>
            <p className="font-semibold text-slate-900">{values.phone}</p>
          </div>
          <div>
            <span className="text-slate-400">Secteur</span>
            <p className="font-semibold text-slate-900">{values.sector}</p>
          </div>
          <div>
            <span className="text-slate-400">Niveau d'etudes</span>
            <p className="font-semibold text-slate-900">{values.studyLevel}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
            Details du rendez-vous
          </p>
          <div>
            <span className="text-slate-400">Destination</span>
            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-600" />
              {destination?.country || '—'}
            </p>
          </div>
          <div>
            <span className="text-slate-400">Consultant</span>
            <p className="font-semibold text-slate-900">
              {consultant ? `${consultant.firstName} ${consultant.lastName}` : '—'}
            </p>
          </div>
          <div>
            <span className="text-slate-400">Date</span>
            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              {formatDate(values.date)}
            </p>
          </div>
          <div>
            <span className="text-slate-400">Horaire</span>
            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              {values.time ? TIME_SLOT_LABELS[values.time as TimeSlot] : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800 flex items-start gap-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Un email de confirmation vous sera envoye apres validation.
          Vous pourrez gerer votre rendez-vous depuis votre espace.
        </p>
      </div>
    </div>
  );
}
