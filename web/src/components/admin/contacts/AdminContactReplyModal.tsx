// components/admin/contacts/AdminContactReplyModal.tsx
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Send, X, AlertCircle, Mail, User, Calendar } from 'lucide-react';
import { Modal } from '@/src/components/common';
import {
  replyContactSchema,
  type ReplyContactFormValues,
} from '@/src/schemas/contact.schema';
import type { ContactResponse } from '@/src/types/contact';

interface AdminContactReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: ContactResponse | null;
  onReply: (reply: string) => Promise<void>;
  isPending?: boolean;
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

export function AdminContactReplyModal({
  isOpen,
  onClose,
  contact,
  onReply,
  isPending = false,
}: AdminContactReplyModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<ReplyContactFormValues>({
    resolver: zodResolver(replyContactSchema),
    mode: 'onChange',
    defaultValues: {
      reply: '',
    },
  });

  const onSubmit = async (values: ReplyContactFormValues) => {
    await onReply(values.reply);
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!contact) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Répondre au message"
      subtitle={`${contact.name || 'Visiteur'} - ${contact.email}`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={!isValid || isPending}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isPending ? 'Envoi...' : 'Envoyer la réponse'}</span>
          </button>
        </div>
      }
    >
      {/* Message original */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="shrink-0">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
              {(contact.name || contact.email).charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 text-sm">
              {contact.name || 'Visiteur'}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                <a href={`mailto:${contact.email}`} className="text-sky-600 hover:underline">
                  {contact.email}
                </a>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(contact.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
          {contact.message}
        </div>
      </div>

      {/* Champ de réponse */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Votre réponse <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={6}
          placeholder="Rédigez votre réponse au message..."
          {...register('reply')}
          className={`w-full p-3 bg-white border ${
            errors.reply ? 'border-red-500' : 'border-slate-300 hover:border-sky-300'
          } rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors resize-none`}
        />
        {errors.reply && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.reply.message}
          </p>
        )}
        <p className="text-[10px] text-slate-400">
          Une copie de la réponse sera envoyée à l'adresse email du contact.
        </p>
      </div>
    </Modal>
  );
}