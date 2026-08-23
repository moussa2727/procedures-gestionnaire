// app/(gestionnaire)/admin/contacts/[id]/repondre/page.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { LoadingState, EmptyState } from '@/src/components/common';
import { useContact, useReplyContact, useMarkContactAsRead, useArchiveContact } from '@/src/hooks/use-contacts';
import type { ContactResponse, ReplyContactPayload } from '@/src/types/contact';
import { ContactStatus } from '@/src/types/enums';
import { ArrowLeft, Mail, User, Calendar, Archive, Send } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { contactKeys } from '@/src/hooks/use-contacts';

export default function AdminContactRepondrePage() {
  const params = useParams();
  const contactId = params.id as string;

  const { data: contact, isLoading, error, refetch } = useContact(contactId);
  const qc = useQueryClient();
  const replyMutation = useReplyContact(contactId);
  const markAsReadMutation = useMarkContactAsRead();
  const archiveMutation = useArchiveContact();

  const [replyText, setReplyText] = useState('');

  const target = contact as ContactResponse | undefined;

  const handleReply = async () => {
    if (!target || !replyText.trim()) return;
    try {
      await replyMutation.mutateAsync({ reply: replyText.trim() });
      toast.success('Réponse envoyée');
      setReplyText('');
      refetch();
      qc.invalidateQueries({ queryKey: contactKeys.all });
    } catch {
      toast.error('Erreur lors de l\'envoi');
    }
  };

  const handleMarkAsRead = async () => {
    if (!target) return;
    try {
      await markAsReadMutation.mutateAsync(target.id);
      toast.success('Marqué comme lu');
      refetch();
    } catch {
      toast.error('Erreur');
    }
  };

  const handleArchive = async () => {
    if (!target) return;
    try {
      await archiveMutation.mutateAsync(target.id);
      toast.success('Message archivé');
      refetch();
    } catch {
      toast.error('Erreur');
    }
  };

  if (isLoading) return <LoadingState message="Chargement du message..." />;
  if (error || !target) return <div className="p-6 text-center text-sm text-red-600">Message introuvable</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link href="/admin/contacts" className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700">
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Répondre au message</h2>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Message original</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Expéditeur</span>
                  <p className="text-slate-900 font-medium mt-0.5 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" />{target.name || target.email}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Email</span>
                  <p className="text-slate-900 font-medium mt-0.5 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" />{target.email}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Date</span>
                  <p className="text-slate-900 font-medium mt-0.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" />{new Date(target.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Statut</span>
                  <p className="text-slate-900 font-medium mt-0.5">{target.status}</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase">Message</span>
                <p className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">{target.message}</p>
              </div>
              {target.reply && (
                <div className="p-4 bg-sky-50 rounded-xl border border-sky-200">
                  <span className="text-xs font-semibold text-sky-700 uppercase">Réponse</span>
                  <p className="mt-2 text-sm text-sky-900 whitespace-pre-wrap">{target.reply}</p>
                  {target.repliedAt && (
                    <p className="mt-1 text-[10px] text-sky-600">Répondu le {new Date(target.repliedAt).toLocaleString('fr-FR')}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Envoyer une réponse</h3>
            <div className="space-y-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Votre réponse..."
                rows={5}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500 resize-none"
              />
              <button
                type="button"
                onClick={handleReply}
                disabled={replyMutation.isPending || !replyText.trim()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Envoyer la réponse
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Actions</h3>
            <div className="space-y-2">
              {target.status === ContactStatus.NEW && (
                <button type="button" onClick={handleMarkAsRead} className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                  Marquer comme lu
                </button>
              )}
              {target.status !== ContactStatus.ARCHIVED && (
                <button type="button" onClick={handleArchive} className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                  <Archive className="w-4 h-4" /> Archiver
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
