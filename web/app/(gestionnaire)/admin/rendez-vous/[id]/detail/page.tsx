// app/(gestionnaire)/admin/rendez-vous/[id]/detail/page.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { LoadingState, EmptyState, ConfirmationModal } from '@/src/components/common';
import { useRendezVous, useRescheduleRendezVous, useCancelRendezVous, useCompleteRendezVous } from '@/src/hooks/use-rendez-vous';
import type { RendezVousResponse } from '@/src/types/rendez-vous';
import { RendezvousStatus, TimeSlot, TIME_SLOT_LABELS } from '@/src/types/enums';
import { ArrowLeft, Calendar, Clock, User, Mail, Phone, MapPin, GraduationCap, XCircle, RotateCcw, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { rendezVousKeys } from '@/src/hooks/use-rendez-vous';
import { availabilityKeys } from '@/src/hooks/use-availability';

export default function AdminRendezVousDetailPage() {
  const params = useParams();
  const rendezVousId = params.id as string;

  const { data: rendezVous, isLoading, error, refetch } = useRendezVous(rendezVousId);
  const rescheduleMutation = useRescheduleRendezVous(rendezVousId);
  const cancelMutation = useCancelRendezVous(rendezVousId);
  const completeMutation = useCompleteRendezVous();
  const qc = useQueryClient();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState<TimeSlot | ''>('');
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  const target = rendezVous as RendezVousResponse | undefined;

  const handleReschedule = async () => {
    if (!target || !rescheduleDate || !rescheduleTime) return;
    try {
      await rescheduleMutation.mutateAsync({ date: rescheduleDate, time: rescheduleTime as TimeSlot });
      toast.success('Rendez-vous replanifié');
      setShowRescheduleModal(false);
      refetch();
      qc.invalidateQueries({ queryKey: rendezVousKeys.all });
      qc.invalidateQueries({ queryKey: availabilityKeys.all });
    } catch {
      toast.error('Erreur');
    }
  };

  const handleCancel = async () => {
    if (!target) return;
    try {
      await cancelMutation.mutateAsync({ reason: cancellationReason });
      toast.success('Rendez-vous annulé');
      setShowCancelModal(false);
      setCancellationReason('');
      refetch();
    } catch {
      toast.error('Erreur');
    }
  };

  const handleComplete = async () => {
    if (!target) return;
    try {
      await completeMutation.mutateAsync(target.id);
      toast.success('Rendez-vous marqué réalisé');
      refetch();
    } catch {
      toast.error('Erreur');
    }
  };

  if (isLoading) return <LoadingState message="Chargement..." />;
  if (error || !target) return <div className="p-6 text-center text-sm text-red-600">Rendez-vous introuvable</div>;

  const canModify = target.status === RendezvousStatus.CONFIRMED || target.status === RendezvousStatus.PENDING;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link href="/admin/rendez-vous" className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700">
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Rendez-vous #{target.id.slice(0, 8)}
          </h2>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Informations</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Candidat</span>
              <p className="text-slate-900 font-medium mt-0.5 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" />{target.firstName} {target.lastName}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Email</span>
              <p className="text-slate-900 font-medium mt-0.5 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" />{target.email}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Téléphone</span>
              <p className="text-slate-900 font-medium mt-0.5 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />{target.phone}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Niveau d'études</span>
              <p className="text-slate-900 font-medium mt-0.5 flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 text-slate-400" />{target.studyLevel}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Date</span>
              <p className="text-slate-900 font-medium mt-0.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" />{target.date}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Heure</span>
              <p className="text-slate-900 font-medium mt-0.5 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" />{TIME_SLOT_LABELS[target.time] || target.time}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Statut</span>
              <p className="text-slate-900 font-medium mt-0.5">{target.status}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Destination</span>
              <p className="text-slate-900 font-medium mt-0.5 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" />{target.destinationId}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Actions</h3>
            <div className="space-y-2">
              {canModify && (
                <button type="button" onClick={() => { setRescheduleDate(target.date); setRescheduleTime(target.time); setShowRescheduleModal(true); }} disabled={rescheduleMutation.isPending} className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Replanifier
                </button>
              )}
              {target.status !== RendezvousStatus.CANCELLED && target.status !== RendezvousStatus.COMPLETED && (
                <>
                  <button type="button" onClick={handleComplete} disabled={completeMutation.isPending} className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Marquer réalisé
                  </button>
                  <button type="button" onClick={() => setShowCancelModal(true)} className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                    <XCircle className="w-4 h-4" /> Annuler
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        title="Annuler le rendez-vous"
        subtitle="Veuillez indiquer le motif d'annulation."
        confirmLabel="Annuler"
        variant="danger"
      >
        <textarea value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} placeholder="Motif d'annulation..." rows={3} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500 mt-2" />
      </ConfirmationModal>

      <ConfirmationModal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        onConfirm={handleReschedule}
        title="Replanifier le rendez-vous"
        subtitle="Sélectionnez la nouvelle date et heure."
        confirmLabel="Replanifier"
      >
        <div className="space-y-3 mt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nouvelle date</label>
            <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nouvel horaire</label>
            <select value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value as TimeSlot)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500">
              <option value="">Sélectionner</option>
              {Object.entries(TIME_SLOT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </ConfirmationModal>
    </div>
  );
}
