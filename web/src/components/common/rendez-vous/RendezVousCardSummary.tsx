'use client';

import React from 'react';
import { User, MapPin, Briefcase } from 'lucide-react';

interface RendezVousCardSummaryProps {
  destinationName: string;
  consultantName: string;
  isConsultant?: boolean;
  rendezVousFirstName?: string;
  rendezVousLastName?: string;
  rendezVousSector?: string;
}

export function RendezVousCardSummary({
  destinationName,
  consultantName,
  isConsultant = false,
  rendezVousFirstName,
  rendezVousLastName,
  rendezVousSector,
}: RendezVousCardSummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
      <div>
        <span className="text-slate-400 block">{isConsultant ? 'Candidat :' : 'Consultant :'}</span>
        <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5 truncate">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{isConsultant ? `${rendezVousFirstName} ${rendezVousLastName}` : consultantName}</span>
        </p>
      </div>
      <div>
        <span className="text-slate-400 block">Destination :</span>
        <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{destinationName}</span>
        </p>
      </div>
      <div>
        <span className="text-slate-400 block">Secteur :</span>
        <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5 truncate">
          <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{rendezVousSector || 'Non spécifié'}</span>
        </p>
      </div>
    </div>
  );
}
