'use client';

import React from 'react';
import { Users } from 'lucide-react';
import type { DestinationResponse } from '@/src/types/destination';

interface AdminDestinationCardSummaryProps {
  destination: DestinationResponse;
  consultantCount: number;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function AdminDestinationCardSummary({
  destination,
  consultantCount,
}: AdminDestinationCardSummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
      <div>
        <span className="text-slate-400 block">ID</span>
        <p className="font-mono text-xs font-semibold text-slate-700 mt-0.5 truncate">
          {destination.id.slice(0, 12)}...
        </p>
      </div>
      <div>
        <span className="text-slate-400 block">Consultants</span>
        <p className="font-semibold text-slate-800 mt-0.5">
          {consultantCount > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              {consultantCount} consultant{consultantCount > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-amber-600">Aucun consultant assigné</span>
          )}
        </p>
      </div>
      <div>
        <span className="text-slate-400 block">Mise à jour</span>
        <p className="font-semibold text-slate-800 mt-0.5">
          {formatDate(destination.updatedAt)}
        </p>
      </div>
    </div>
  );
}
