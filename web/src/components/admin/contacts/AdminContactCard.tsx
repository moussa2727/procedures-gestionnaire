// components/admin/contacts/AdminContactCard.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Reply,
  Archive,
  Trash2,
  CheckCircle2,
  X,
  Clock,
  MessageSquare,
  AtSign,
} from 'lucide-react';
import { ContactStatus } from '@/src/types/enums';
import type { ContactResponse } from '@/src/types/contact';
import { ContactStatusBadge } from './ContactStatusBadge';

interface AdminContactCardProps {
  contact: ContactResponse;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onMarkAsRead: () => void;
  onReply: () => void;
  onArchive: () => void;
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

function getInitials(name: string) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function AdminContactCard({
  contact,
  isExpanded = false,
  onToggleExpand,
  onMarkAsRead,
  onReply,
  onArchive,
  onDelete,
  className = '',
}: AdminContactCardProps) {
  const isNew = contact.status === ContactStatus.NEW;
  const isArchived = contact.status === ContactStatus.ARCHIVED;

  return (
    <div
      className={`bg-white border rounded-2xl p-4 sm:p-5 transition-all ${
        isExpanded ? 'border-sky-400 shadow-sm' : 'border-slate-200 hover:border-sky-300 shadow-sm'
      } ${isNew ? 'border-l-4 border-l-sky-500' : ''} ${className}`}
    >
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          {/* Avatar */}
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm shrink-0">
            {getInitials(contact.name || contact.email)}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {contact.name || 'Visiteur'}
              </h3>
              <ContactStatusBadge status={contact.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <AtSign className="w-3.5 h-3.5 text-slate-400" />
                <a href={`mailto:${contact.email}`} className="text-sky-600 hover:underline">
                  {contact.email}
                </a>
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formatDate(contact.createdAt)}
              </span>
              {contact.repliedAt && (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <Reply className="w-3.5 h-3.5" />
                  Répondu le {formatDate(contact.repliedAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
          {/* Actions rapides */}
          {isNew && !isArchived && (
            <button
              type="button"
              onClick={onMarkAsRead}
              className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
              title="Marquer comme lu"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}

          {!isArchived && (
            <button
              type="button"
              onClick={onReply}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Répondre"
            >
              <Reply className="w-4 h-4" />
            </button>
          )}

          {!isArchived && (
            <button
              type="button"
              onClick={onArchive}
              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              title="Archiver"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* Aperçu du message */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <p className="text-xs text-slate-700 line-clamp-2">
          {contact.message}
        </p>
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
            {/* Message complet */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Message
              </h4>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap">
                {contact.message}
              </div>
            </div>

            {/* Réponse si existante */}
            {contact.reply && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                  <Reply className="w-3.5 h-3.5 text-emerald-600" />
                  Réponse
                </h4>
                <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-xs text-slate-700 whitespace-pre-wrap">
                  {contact.reply}
                </div>
                {contact.repliedAt && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Répondu le {formatDate(contact.repliedAt)}
                  </p>
                )}
              </div>
            )}

            {/* Métadonnées */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block">Statut</span>
                <span className="font-semibold text-slate-800">
                  <ContactStatusBadge status={contact.status} />
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block">Reçu le</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(contact.createdAt)}
                </span>
              </div>
              {contact.archivedAt && (
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block">Archivé le</span>
                  <span className="font-semibold text-slate-800">
                    {formatDate(contact.archivedAt)}
                  </span>
                </div>
              )}
              
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}