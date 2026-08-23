'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { LoadingState, EmptyState } from '@/src/components/common';
import { contactService } from '@/src/services/contact.service';
import { useContact, useMarkContactAsRead, useReplyContact } from '@/src/hooks/use-contacts';
import type { ContactResponse } from '@/src/types/contact';
import { ContactStatus } from '@/src/types/enums';
import { Mail, User, Calendar, ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

export default function AdminContactDetailPage() {
  const params = useParams();
  const contactId = params.id as string;

  const { data: contact, isLoading, error, refetch } = useContact(contactId);
  const markAsReadMutation = useMarkContactAsRead();
  const replyMutation = useReplyContact(contactId);

  const [replyText, setReplyText] = useState('');

  const target = contact as ContactResponse | undefined;

  const handleMarkAsRead = async () => {
    if (!target) return;
    try {
      await markAsReadMutation.mutateAsync(target.id);
      toast.success('Contact marqué comme lu');
      refetch();
    } catch {
      toast.error('Erreur');
    }
  };

  const handleReply = async () => {
    if (!target || !replyText.trim()) return;
    try {
       await replyMutation.mutateAsync({ reply: replyText });
      toast.success('Réponse envoyée');
      setReplyText('');
      refetch();
    } catch {
      toast.error('Erreur');
    }
  };

  if (isLoading) return <LoadingState message="Chargement..." />;
  if (error || !target) return <div className="p-6 text-center text-sm text-red-600">Contact introuvable</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link href="/admin/contacts" className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700">
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Contact #{target.id.slice(0, 8)}
          </h2>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Message</h3>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{target.message}</p>
            </div>
            {target.reply && (
              <div className="p-4 bg-sky-50 rounded-xl border border-sky-200">
                <p className="text-xs font-semibold text-sky-700 mb-1">Réponse</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{target.reply}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Informations</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">{target.name || 'Anonyme'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">{target.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">{new Date(target.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
              <div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
                  target.status === ContactStatus.NEW ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  target.status === ContactStatus.REPLIED ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  target.status === ContactStatus.ARCHIVED ? 'bg-slate-50 text-slate-700 border-slate-200' :
                  'bg-sky-50 text-sky-700 border-sky-200'
                }`}>
                  {target.status}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {target.status === ContactStatus.NEW && (
                <button type="button" onClick={handleMarkAsRead} disabled={markAsReadMutation.isPending} className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                  Marquer comme lu
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Répondre</h3>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              placeholder="Votre réponse..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500"
            />
            <button
              type="button"
              onClick={handleReply}
              disabled={replyMutation.isPending || !replyText.trim()}
              className="mt-2 w-full px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Envoyer la réponse
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
