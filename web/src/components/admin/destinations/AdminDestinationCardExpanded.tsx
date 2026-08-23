'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Users, Eye } from 'lucide-react';
import type { DestinationResponse } from '@/src/types/destination';

interface AdminDestinationCardExpandedProps {
  destination: DestinationResponse;
  consultantCount: number;
  consultantNames: string[];
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

export function AdminDestinationCardExpanded({
  destination,
  consultantCount,
  consultantNames,
}: AdminDestinationCardExpandedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      className="mt-4 pt-4 border-t border-slate-200 bg-slate-50/80 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5 rounded-b-2xl space-y-4"
    >
      <div>
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          Description
        </h4>
        <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
          {destination.description || 'Aucune description disponible'}
        </p>
      </div>

      <div>
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          Consultants assignés ({consultantCount})
        </h4>
        {consultantNames.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {consultantNames.map((name, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
              >
                <Users className="w-3 h-3 text-slate-400" />
                {name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
            Aucun consultant assigné à cette destination.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <span className="text-slate-400 block">Créée le</span>
          <span className="font-semibold text-slate-800">
            {formatDate(destination.createdAt)}
          </span>
        </div>
        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <span className="text-slate-400 block">Dernière mise à jour</span>
          <span className="font-semibold text-slate-800">
            {formatDate(destination.updatedAt)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
