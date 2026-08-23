'use client';

import React from 'react';
import { Eye, Edit, Trash2, Archive, RotateCcw } from 'lucide-react';

interface AdminDestinationCardActionsProps {
  isArchived: boolean;
  onViewDetails?: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

export function AdminDestinationCardActions({
  isArchived,
  onViewDetails,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: AdminDestinationCardActionsProps) {
  return (
    <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200">
      {onViewDetails && (
        <button
          type="button"
          onClick={onViewDetails}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-sky-300 text-slate-700 text-xs font-semibold rounded-lg transition-all"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Détails</span>
        </button>
      )}

      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-sky-300 text-slate-700 text-xs font-semibold rounded-lg transition-all"
      >
        <Edit className="w-3.5 h-3.5" />
        <span>Modifier</span>
      </button>

      {isArchived ? (
        <button
          type="button"
          onClick={onRestore}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurer</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onArchive}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Archiver</span>
        </button>
      )}

      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Supprimer</span>
      </button>
    </div>
  );
}
