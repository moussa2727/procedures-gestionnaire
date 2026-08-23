// app/(gestionnaire)/admin/availability/[consultantId]/page.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { LoadingState, EmptyState, ConfirmationModal } from '@/src/components/common';
import { useConsultantUnavailabilities, useCreateAbsenceForConsultant, useRemoveAbsence, useConsultantUnavailabilityRealtime } from '@/src/hooks/use-consultant-unavailability';
import { useUsersByRole } from '@/src/hooks/use-users';
import { AbsenceType, ABSENCE_TYPE_LABELS } from '@/src/types/enums';
import type { UnavailabilityResponse, CreateUnavailabilityPayload } from '@/src/types/availability';
import { UserRole } from '@/src/types/enums';
import { ArrowLeft, Calendar, Clock, Trash2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { unavailabilityKeys } from '@/src/hooks/use-consultant-unavailability';

export default function AdminAvailabilityPage() {
  const params = useParams();
  const consultantId = params.consultantId as string;

  useConsultantUnavailabilityRealtime();

  const { data: consultants } = useUsersByRole(UserRole.CONSULTANT);
  const { data: absences, isLoading, error, refetch } = useConsultantUnavailabilities(consultantId);
  const createMutation = useCreateAbsenceForConsultant(consultantId);
  const removeMutation = useRemoveAbsence();
  const qc = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAbsence, setNewAbsence] = useState<CreateUnavailabilityPayload>({ startDate: '', endDate: '', type: AbsenceType.CONGES, reason: '' });

  const consultant = consultants?.find?.((c: any) => c.id === consultantId);
  const consultantName = consultant ? `${consultant.firstName} ${consultant.lastName}` : 'Consultant';

  const absenceList = Array.isArray(absences) ? absences : absences || [];

  const handleCreate = async () => {
    if (!newAbsence.startDate || !newAbsence.endDate || !newAbsence.type) return;
    try {
      await createMutation.mutateAsync(newAbsence);
      toast.success('Indisponibilité créée');
      setShowCreateModal(false);
      setNewAbsence({ startDate: '', endDate: '', type: AbsenceType.CONGES, reason: '' });
      refetch();
      qc.invalidateQueries({ queryKey: unavailabilityKeys.all });
    } catch {
      toast.error('Erreur');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeMutation.mutateAsync(id);
      toast.success('Indisponibilité supprimée');
      refetch();
    } catch {
      toast.error('Erreur');
    }
  };

  if (isLoading) return <LoadingState message="Chargement des indisponibilités..." />;
  if (error) return <div className="p-6 text-center text-sm text-red-600">Erreur lors du chargement</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link href="/admin/availability" className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700">
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Indisponibilités</h2>
          <p className="mt-1 text-sm text-slate-500">Gestion pour {consultantName}</p>
        </div>
      </header>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => refetch()} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:border-sky-300 hover:text-sky-700 transition-colors">
          Actualiser
        </button>
        <button type="button" onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5" /> Nouvelle indisponibilité
        </button>
      </div>

      {absenceList.length === 0 ? (
        <EmptyState title="Aucune indisponibilité" description="Aucune indisponibilité enregistrée pour ce consultant." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {absenceList.map((absence: UnavailabilityResponse) => (
            <div key={absence.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{ABSENCE_TYPE_LABELS[absence.type] || absence.type}</span>
                <button type="button" onClick={() => handleDelete(absence.id)} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Du {absence.startDate} au {absence.endDate}</div>
                {absence.reason && <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" />{absence.reason}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onConfirm={handleCreate}
        title="Nouvelle indisponibilité"
        subtitle="Déclarez une période d'indisponibilité pour le consultant."
        confirmLabel="Créer"
        isPending={createMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
            <select value={newAbsence.type} onChange={(e) => setNewAbsence({ ...newAbsence, type: e.target.value as AbsenceType })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500">
              {Object.entries(ABSENCE_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date de début</label>
            <input type="date" value={newAbsence.startDate} onChange={(e) => setNewAbsence({ ...newAbsence, startDate: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date de fin</label>
            <input type="date" value={newAbsence.endDate} onChange={(e) => setNewAbsence({ ...newAbsence, endDate: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Motif (optionnel)</label>
            <input type="text" value={newAbsence.reason || ''} onChange={(e) => setNewAbsence({ ...newAbsence, reason: e.target.value })} placeholder="Motif..." className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500" />
          </div>
        </div>
      </ConfirmationModal>
    </div>
  );
}
