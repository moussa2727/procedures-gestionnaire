// components/admin/availability/AdminAvailabilityCard.tsx
'use client';

import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  User,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CalendarDays,
  Users,
} from 'lucide-react';
import { AbsenceType, ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS } from '@/src/types/enums';
import type { UnavailabilityResponse } from '@/src/types/availability';

interface AdminAvailabilityCardProps {
  availability: UnavailabilityResponse;
  consultantName?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onDelete: () => void;
  className?: string;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatShortDate(dateStr: string) {
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

function getTypeLabel(type: AbsenceType): string {
  return ABSENCE_TYPE_LABELS[type] || type;
}

function getTypeColor(type: AbsenceType): string {
  return ABSENCE_TYPE_COLORS[type] || '#9E9E9E';
}

function getTypeBadgeClass(type: AbsenceType): string {
  const color = getTypeColor(type);
  // Mapping approximatif pour des classes Tailwind
  const colorMap: Record<string, string> = {
    '#4CAF50': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    '#E91E63': 'bg-rose-50 text-rose-700 border-rose-200',
    '#2196F3': 'bg-sky-50 text-sky-700 border-sky-200',
    '#9C27B0': 'bg-purple-50 text-purple-700 border-purple-200',
    '#F44336': 'bg-red-50 text-red-700 border-red-200',
    '#FF9800': 'bg-amber-50 text-amber-700 border-amber-200',
    '#00BCD4': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    '#795548': 'bg-amber-50 text-amber-700 border-amber-200',
    '#607D8B': 'bg-slate-50 text-slate-700 border-slate-200',
    '#8BC34A': 'bg-lime-50 text-lime-700 border-lime-200',
    '#FF5722': 'bg-orange-50 text-orange-700 border-orange-200',
    '#FF4081': 'bg-pink-50 text-pink-700 border-pink-200',
    '#D32F2F': 'bg-red-50 text-red-700 border-red-200',
    '#9E9E9E': 'bg-slate-50 text-slate-700 border-slate-200',
  };
  return colorMap[color] || 'bg-slate-50 text-slate-700 border-slate-200';
}

export function AdminAvailabilityCard({
  availability,
  consultantName,
  isExpanded = false,
  onToggleExpand,
  onDelete,
  className = '',
}: AdminAvailabilityCardProps) {
  const typeLabel = getTypeLabel(availability.type);
  const badgeClass = getTypeBadgeClass(availability.type);
  const isMultiDay = availability.startDate !== availability.endDate;

  return (
    <div
      className={`bg-white border rounded-2xl p-4 sm:p-5 transition-all ${
        isExpanded ? 'border-sky-400 shadow-sm' : 'border-slate-200 hover:border-sky-300 shadow-sm'
      } ${className}`}
    >
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <CalendarDays className="w-5 h-5 text-slate-500" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                #{availability.id.slice(0, 8)}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}>
                {typeLabel}
              </span>
              {isMultiDay && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <Calendar className="w-3 h-3" />
                  Multi-jours
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              {consultantName || `Consultant #${availability.consultantId.slice(0, 8)}`}
            </h3>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
          <div className="text-left sm:text-right">
            <div className="flex items-center sm:justify-end gap-1.5 text-xs font-bold text-slate-900">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>{formatShortDate(availability.startDate)}</span>
              {isMultiDay && (
                <>
                  <span className="text-slate-300">→</span>
                  <span>{formatShortDate(availability.endDate)}</span>
                </>
              )}
            </div>
            <div className="flex items-center sm:justify-end gap-1.5 text-xs font-semibold text-slate-500 mt-0.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Du {formatDate(availability.startDate)}</span>
              {isMultiDay && (
                <span>au {formatDate(availability.endDate)}</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleExpand}
            className="p-2 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-slate-50 text-slate-600 transition-all shrink-0"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
        <div>
          <span className="text-slate-400 block">Consultant</span>
          <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{consultantName || `ID: ${availability.consultantId.slice(0, 8)}`}</span>
          </p>
        </div>
        <div>
          <span className="text-slate-400 block">Type</span>
          <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            {typeLabel}
          </p>
        </div>
        <div>
          <span className="text-slate-400 block">Créé par</span>
          <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {availability.createdBy || 'Système'}
          </p>
        </div>
      </div>

      {/* Détails étendus */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-4 pt-4 border-t border-slate-200 bg-slate-50/80 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5 rounded-b-2xl space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Détails de l'indisponibilité */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                  Détails de l'indisponibilité
                </p>
                <div className="space-y-1 text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-500">Type :</span>{' '}
                    <span className="font-medium text-slate-800">{typeLabel}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-500">Début :</span>{' '}
                    <span className="text-slate-800">{formatDate(availability.startDate)}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-500">Fin :</span>{' '}
                    <span className="text-slate-800">{formatDate(availability.endDate)}</span>
                  </p>
                  {availability.reason && (
                    <p>
                      <span className="font-semibold text-slate-500">Motif :</span>{' '}
                      <span className="text-slate-700">{availability.reason}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Métadonnées */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                  Métadonnées
                </p>
                <div className="space-y-1 text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-500">ID :</span>{' '}
                    <span className="font-mono text-slate-800">{availability.id}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-500">Consultant :</span>{' '}
                    <span className="font-mono text-slate-800">{availability.consultantId}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-500">Créé le :</span>{' '}
                    <span className="text-slate-800">{formatDate(availability.createdAt)}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}