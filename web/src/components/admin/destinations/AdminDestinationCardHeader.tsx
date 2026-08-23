'use client';

import React from 'react';
import { Building2, Users, Eye, Edit, Trash2, Archive, RotateCcw, ChevronDown, ChevronUp, CheckCircle, Clock } from 'lucide-react';
import { StatusBadge } from '@/src/components/common';
import type { DestinationResponse } from '@/src/types/destination';

interface AdminDestinationCardHeaderProps {
  destination: DestinationResponse;
  consultantCount: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
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

function getStatusInfo(destination: DestinationResponse) {
  if (destination.isDeleted) {
    return {
      label: 'Archivée',
      variant: 'archived' as const,
      icon: <Archive className="w-3.5 h-3.5" />,
    };
  }
  if ((destination.activeConsultantsCount || 0) > 0) {
    return {
      label: 'Active',
      variant: 'active' as const,
      icon: <CheckCircle className="w-3.5 h-3.5" />,
    };
  }
  return {
    label: 'En attente',
    variant: 'pending' as const,
    icon: <Clock className="w-3.5 h-3.5" />,
  };
}

export function AdminDestinationCardHeader({
  destination,
  consultantCount,
  isExpanded,
  onToggleExpand,
}: AdminDestinationCardHeaderProps) {
  const status = getStatusInfo(destination);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
          {destination.photo ? (
            <img
              src={destination.photo}
              alt={destination.country}
              className="w-full h-full object-cover"
            />
          ) : (
            <Building2 className="w-6 h-6 text-slate-400" />
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              {destination.country}
            </h3>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                status.variant === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : status.variant === 'archived'
                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {status.icon}
              {status.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
            {destination.description || 'Aucune description'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-slate-500">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">{consultantCount}</span>
          </div>
          <div className="text-slate-300">|</div>
          <div className="text-slate-400">
            {formatDate(destination.createdAt)}
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
  );
}
