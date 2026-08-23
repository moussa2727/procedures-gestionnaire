'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  useDestinations,
  useCreateDestination,
  useUpdateDestination,
  useRemoveDestination,
  useRestoreDestination,
  useHardDeleteDestination,
  useDestinationsRealtime,
} from '@/src/hooks/use-destinations';
import { useConsultantsSemiPublic } from '@/src/hooks/use-users';
import { useConsultantsByDestination } from '@/src/hooks/use-consultant-destination';
import {
  AdminDestinationList,
  CreateDestinationModal,
  UpdateDestinationModal,
} from '@/src/components/admin/destinations';
import type { DestinationResponse } from '@/src/types/destination';
import type { CreateDestinationFormValues, UpdateDestinationFormValues } from '@/src/schemas/destination.schema';

export default function AdminDestinationsPage() {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<DestinationResponse | null>(null);

  // 1. Activer temps réel
  useDestinationsRealtime();

  // 2. Données
  const { data: destinationsData, isLoading: isLoadingDestinations, refetch } = useDestinations();
  const { data: consultantsData } = useConsultantsSemiPublic();
  const { data: assignedConsultants } = useConsultantsByDestination(editingDestination?.id || '');

  const createMutation = useCreateDestination();
  const updateMutation = useUpdateDestination(editingDestination?.id || '');
  const removeMutation = useRemoveDestination();
  const restoreMutation = useRestoreDestination();
  const hardDeleteMutation = useHardDeleteDestination();

  const destinations: DestinationResponse[] = Array.isArray(destinationsData)
    ? destinationsData
    : (destinationsData as any)?.data || [];

  const consultants = Array.isArray(consultantsData)
    ? consultantsData
    : (consultantsData as any)?.data || [];

  const consultantMap = useMemo(() => {
    const map: Record<string, { count: number; names: string[] }> = {};
    for (const d of destinations) {
      map[d.id] = {
        count: d.activeConsultantsCount || 0,
        names: [],
      };
    }
    return map;
  }, [destinations]);

  const assignedConsultantIds = useMemo(() => {
    if (!assignedConsultants) return [];
    const list = Array.isArray(assignedConsultants)
      ? assignedConsultants
      : (assignedConsultants as any)?.data || [];
    return list
      .filter((a: any) => a.consultant?.isActive)
      .map((a: any) => a.consultantId);
  }, [assignedConsultants]);

  const handleRefresh = () => refetch();

  const handleCreateSubmit = async (values: CreateDestinationFormValues) => {
    await createMutation.mutateAsync(values);
    setIsCreateOpen(false);
  };

  const handleUpdateSubmit = async (values: UpdateDestinationFormValues) => {
    if (!editingDestination) return;
    await updateMutation.mutateAsync(values);
    setEditingDestination(null);
  };

  const handleArchive = (destination: DestinationResponse) => {
    removeMutation.mutate(destination.id);
  };

  const handleRestore = (destination: DestinationResponse) => {
    restoreMutation.mutate(destination.id);
  };

  const handleHardDelete = (destination: DestinationResponse) => {
    hardDeleteMutation.mutate(destination.id);
  };

  return (
    <div className="space-y-6">
      <AdminDestinationList
        destinations={destinations}
        isLoading={isLoadingDestinations}
        consultantMap={consultantMap}
        onRefresh={handleRefresh}
        onCreate={() => setIsCreateOpen(true)}
        onEdit={(d) => setEditingDestination(d)}
        onArchive={handleArchive}
        onRestore={handleRestore}
        onDelete={handleHardDelete}
        onViewDetails={(d) => router.push(`/admin/destinations/${d.id}`)}
      />

      {isCreateOpen && (
        <CreateDestinationModal
          isOpen={true}
          onClose={() => setIsCreateOpen(false)}
          onCreate={handleCreateSubmit}
          consultants={consultants}
          isPending={createMutation.isPending}
        />
      )}

      {editingDestination && (
        <UpdateDestinationModal
          isOpen={true}
          onClose={() => setEditingDestination(null)}
          destination={editingDestination}
          onUpdate={handleUpdateSubmit}
          consultants={consultants}
          assignedConsultantIds={assignedConsultantIds}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}
