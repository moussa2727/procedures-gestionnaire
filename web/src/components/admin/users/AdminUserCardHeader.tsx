'use client';

import React from 'react';
import { User, Mail, Phone, Calendar, Crown, Shield, GraduationCap, ChevronDown, ChevronUp, Edit, Trash2, CheckCircle, XCircle, UserCheck, UserX } from 'lucide-react';
import { UserRole } from '@/src/types/enums';
import type { UserResponse } from '@/src/types/user';

interface AdminUserCardHeaderProps {
  user: UserResponse;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onPromoteToConsultant?: () => void;
  onDelete: () => void;
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

function getRoleIcon(role: UserRole) {
  switch (role) {
    case UserRole.ADMIN:
      return <Crown className="w-3.5 h-3.5 text-amber-600" />;
    case UserRole.CONSULTANT:
      return <Shield className="w-3.5 h-3.5 text-sky-600" />;
    case UserRole.ETUDIANT:
      return <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />;
  }
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

function getRoleColor(role: UserRole) {
  switch (role) {
    case UserRole.ADMIN:
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case UserRole.CONSULTANT:
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case UserRole.ETUDIANT:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
}

export function AdminUserCardHeader({
  user,
  isExpanded,
  onToggleExpand,
  onEdit,
  onToggleStatus,
  onPromoteToConsultant,
  onDelete,
}: AdminUserCardHeaderProps) {
  const isActive = user.isActive;
  const isOnline = user.isOnline;
  const canPromote = user.role === UserRole.ETUDIANT && isActive;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm shrink-0 overflow-hidden">
          {user.photo ? (
            <img src={user.photo} alt={user.firstName} className="w-full h-full object-cover" />
          ) : (
            `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              {user.firstName} {user.lastName}
            </h3>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(
                user.role
              )}`}
            >
              {getRoleIcon(user.role)}
              {getRoleLabel(user.role)}
            </span>
            {isOnline && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                En ligne
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <a href={`mailto:${user.email}`} className="text-sky-600 hover:underline">
                {user.email}
              </a>
            </span>
            {user.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {user.phone}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {formatDate(user.createdAt)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {isActive ? 'Actif' : 'Inactif'}
        </span>

        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
          title="Modifier"
        >
          <Edit className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleStatus}
          className={`p-1.5 rounded-lg transition-colors ${
            isActive
              ? 'text-amber-600 hover:bg-amber-50'
              : 'text-emerald-600 hover:bg-emerald-50'
          }`}
          title={isActive ? 'Désactiver' : 'Activer'}
        >
          {isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
        </button>

        {canPromote && onPromoteToConsultant && (
          <button
            type="button"
            onClick={onPromoteToConsultant}
            className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
            title="Promouvoir consultant"
          >
            <Shield className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleExpand}
          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
