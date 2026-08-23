'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { consultantDestinationService } from '@/src/services/consultant-destination.service';
import { extractErrorMessage } from '@/src/lib/api-client';
import { destinationKeys } from './use-destinations';

export const consultantDestinationKeys = {
  all: ['consultant-destinations'] as const,
  byDestination: (id: string) => [...consultantDestinationKeys.all, 'destination', id] as const,
  byConsultant: (id: string) => [...consultantDestinationKeys.all, 'consultant', id] as const,
};

export function useConsultantsByDestination(destinationId: string) {
  return useQuery({
    queryKey: consultantDestinationKeys.byDestination(destinationId),
    queryFn: () => consultantDestinationService.listByDestination(destinationId),
    enabled: !!destinationId,
  });
}

export function useDestinationsByConsultant(consultantId: string) {
  return useQuery({
    queryKey: consultantDestinationKeys.byConsultant(consultantId),
    queryFn: () => consultantDestinationService.listByConsultant(consultantId),
    enabled: !!consultantId,
  });
}

export function useAssignConsultant(destinationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (consultantId: string) =>
      consultantDestinationService.assign(destinationId, consultantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: consultantDestinationKeys.byDestination(destinationId) });
      qc.invalidateQueries({ queryKey: destinationKeys.detail(destinationId) });
      toast.success('Consultant affecté');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useRemoveConsultantAssignment(destinationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (consultantId: string) =>
      consultantDestinationService.remove(destinationId, consultantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: consultantDestinationKeys.byDestination(destinationId) });
      qc.invalidateQueries({ queryKey: destinationKeys.detail(destinationId) });
      toast.success('Affectation retirée');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}
