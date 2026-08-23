'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Shield, Edit } from 'lucide-react';
import { UserRole } from '@/src/types/enums';
import type { UserResponse } from '@/src/types/user';

interface AdminUserCardExpandedProps {
  user: UserResponse;
  onPromoteToConsultant?: () => void;
  onEdit: () => void;
}

function getRoleLabel(role: UserRole) {
  switch (role) {
    case UserRole.ADMIN:
      return 'Administrateur';
    case UserRole.CONSULTANT:
      return 'Consultant';
    case UserRole.ETUDIANT:
      return 'Étudiant';
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function AdminUserCardExpanded({ user, onPromoteToConsultant, onEdit }: AdminUserCardExpandedProps) {
  const isActive = user.isActive;
  const isDeleted = user.isDeleted;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      className="mt-4 pt-4 border-t border-slate-200 bg-slate-50/80 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5 rounded-b-2xl space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
          <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
            Informations générales
          </p>
          <div className="space-y-1 text-slate-600">
            <p>
              <span className="font-semibold text-slate-500">ID :</span>{' '}
              <span className="font-mono text-slate-800">{user.id}</span>
            </p>
            <p>
              <span className="font-semibold text-slate-500">Rôle :</span>{' '}
              <span className="font-medium text-slate-800">{getRoleLabel(user.role)}</span>
            </p>
            <p>
              <span className="font-semibold text-slate-500">Statut :</span>{' '}
              <span className={`font-medium ${isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isActive ? 'Actif' : 'Inactif'}
              </span>
            </p>
            {isDeleted && (
              <p className="text-rose-600">
                <span className="font-semibold text-rose-500">Compte supprimé</span>
              </p>
            )}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
          <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
            Dates
          </p>
          <div className="space-y-1 text-slate-600">
            <p>
              <span className="font-semibold text-slate-500">Créé le :</span>{' '}
              <span className="text-slate-800">{formatDate(user.createdAt)}</span>
            </p>
            <p>
              <span className="font-semibold text-slate-500">Mis à jour :</span>{' '}
              <span className="text-slate-800">{formatDate(user.updatedAt)}</span>
            </p>
            {user.lastSeen && (
              <p>
                <span className="font-semibold text-slate-500">Dernière activité :</span>{' '}
                <span className="text-slate-800">{formatDate(user.lastSeen)}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200">
        {user.role === UserRole.ETUDIANT && isActive && onPromoteToConsultant && (
          <button
            type="button"
            onClick={onPromoteToConsultant}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-semibold rounded-lg transition-all"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Promouvoir consultant</span>
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
      </div>
    </motion.div>
  );
}
