// app/(gestionnaire)/admin/absences/nouvelle/page.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { LoadingState, EmptyState, ConfirmationModal } from '@/src/components/common';
import { useUsersByRole } from '@/src/hooks/use-users';
import { useCreateAbsenceForConsultant, useConsultantUnavailabilityRealtime } from '@/src/hooks/use-consultant-unavailability';
import { AbsenceType, ABSENCE_TYPE_LABELS } from '@/src/types/enums';
import type { CreateUnavailabilityPayload } from '@/src/types/availability';
import { UserRole } from '@/src/types/enums';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { unavailabilityKeys } from '@/src/hooks/use-consultant-unavailability';

export default function AdminAbsenceNouvellePage() {
  const searchParams = useSearchParams();
  const preselectedConsultantId = searchParams.get('consultantId') || '';

  useConsultantUnavailabilityRealtime();

  const { data: consultants } = useUsersByRole(UserRole.CONSULTANT);
  const consultantList = Array.isArray(consultants) ? consultants : (consultants as any)?.data || [];

  const [selectedConsultantId, setSelectedConsultantId] = useState(preselectedConsultantId);
  const [newAbsence, setNewAbsence] = useState<CreateUnavailabilityPayload>({ startDate: '', endDate: '', type: AbsenceType.CONGES, reason: '' });

  const createMutation = useCreateAbsenceForConsultant(selectedConsultantId);
  const qc = useQueryClient();

  useEffect(() => {
    if (preselectedConsultantId && !selectedConsultantId) {
      setSelectedConsultantId(preselectedConsultantId);
    }
  }, [preselectedConsultantId]);

  const handleCreate = async () => {
    if (!selectedConsultantId || !newAbsence.startDate || !newAbsence.endDate || !newAbsence.type) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    try {
      await createMutation.mutateAsync(newAbsence);
      toast.success('Absence déclarée');
      setNewAbsence({ startDate: '', endDate: '', type: AbsenceType.CONGES, reason: '' });
      qc.invalidateQueries({ queryKey: unavailabilityKeys.all });
    } catch {
      toast.error('Erreur');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link href="/admin/absences" className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700">
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Nouvelle absence</h2>
          <p className="mt-1 text-sm text-slate-500">Déclarez une indisponibilité pour un consultant</p>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Consultant</label>
            <select value={selectedConsultantId} onChange={(e) => setSelectedConsultantId(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500">
              <option value="">Sélectionner un consultant</option>
              {consultantList.map((c: any) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Type d'absence</label>
            <select value={newAbsence.type} onChange={(e) => setNewAbsence({ ...newAbsence, type: e.target.value as AbsenceType })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500">
              {Object.entries(ABSENCE_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date de début</label>
              <input type="date" value={newAbsence.startDate} onChange={(e) => setNewAbsence({ ...newAbsence, startDate: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date de fin</label>
              <input type="date" value={newAbsence.endDate} onChange={(e) => setNewAbsence({ ...newAbsence, endDate: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Motif (optionnel)</label>
            <input type="text" value={newAbsence.reason || ''} onChange={(e) => setNewAbsence({ ...newAbsence, reason: e.target.value })} placeholder="Motif..." className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500" />
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="w-full px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            Déclarer l'absence
          </button>
        </div>
      </div>
    </div>
  );
}
