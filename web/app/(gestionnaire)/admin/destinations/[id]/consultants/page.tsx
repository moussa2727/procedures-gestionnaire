'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { LoadingState, EmptyState } from '@/src/components/common';
import { consultantDestinationService } from '@/src/services/consultant-destination.service';
import { useConsultantsByDestination, useAssignConsultant, useRemoveConsultantAssignment } from '@/src/hooks/use-consultant-destination';
import { useUsersByRole } from '@/src/hooks/use-users';
import { UserRole } from '@/src/types/enums';
import { User, Plus, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { UserResponse } from '@/src/types/user';
import type { ConsultantDestinationAssignment } from '@/src/types/consultant-destination';

export default function AdminDestinationConsultantsPage() {
  const params = useParams();
  const destinationId = params.id as string;

  const { data: assignments, isLoading: isLoadingAssignments, refetch: refetchAssignments } = useConsultantsByDestination(destinationId);
  const assignMutation = useAssignConsultant(destinationId);
  const removeMutation = useRemoveConsultantAssignment(destinationId);

  const { data: consultants } = useUsersByRole(UserRole.CONSULTANT);
  const consultantList: UserResponse[] = consultants || [];

  const assignmentsList: ConsultantDestinationAssignment[] = Array.isArray(assignments) ? assignments : (assignments as any)?.data || [];

  const assignedIds = new Set(assignmentsList.map((a: ConsultantDestinationAssignment) => a.consultantId));
  const availableConsultants = consultantList.filter((c: UserResponse) => !assignedIds.has(c.id));

  const handleAssign = async (consultantId: string) => {
    try {
      await assignMutation.mutateAsync(consultantId);
      toast.success('Consultant assigné');
      refetchAssignments();
    } catch {
      toast.error('Erreur');
    }
  };

  const handleRemove = async (consultantId: string) => {
    try {
      await removeMutation.mutateAsync(consultantId);
      toast.success('Consultant retiré');
      refetchAssignments();
    } catch {
      toast.error('Erreur');
    }
  };

  if (isLoadingAssignments) return <LoadingState message="Chargement..." />;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link href={`/admin/destinations/${destinationId}`} className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700">
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Consultants assignés</h2>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Assignés</h3>
          {assignmentsList.length === 0 ? (
            <EmptyState title="Aucun consultant" description="Aucun consultant n'est assigné à cette destination." />
          ) : (
            <div className="space-y-2">
              {assignmentsList.map((assignment: ConsultantDestinationAssignment) => (
                <div key={assignment.consultantId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {assignment.consultant?.firstName} {assignment.consultant?.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{assignment.consultant?.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(assignment.consultantId)}
                    disabled={removeMutation.isPending}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Disponibles</h3>
          {availableConsultants.length === 0 ? (
            <EmptyState title="Aucun consultant disponible" description="Tous les consultants sont déjà assignés." />
          ) : (
            <div className="space-y-2">
              {availableConsultants.map((consultant: UserResponse) => (
                <div key={consultant.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {consultant.firstName} {consultant.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{consultant.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAssign(consultant.id)}
                    disabled={assignMutation.isPending}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Assigner
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
