'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSocket } from '@/src/lib/socket-client';
import { destinationService } from '@/src/services/destination.service';
import { extractErrorMessage } from '@/src/lib/api-client';
import type {
  CreateDestinationPayload,
  UpdateDestinationPayload,
  DestinationResponse,
} from '@/src/types/destination';

export const destinationKeys = {
  all: ['destinations'] as const,
  lists: () => [...destinationKeys.all, 'list'] as const,
  search: (q: string) => [...destinationKeys.all, 'search', q] as const,
  detail: (id: string) => [...destinationKeys.all, 'detail', id] as const,
};

export function useDestinations() {
  return useQuery({
    queryKey: destinationKeys.lists(),
    queryFn: destinationService.findAll,
  });
}

export function useDestinationSearch(q: string) {
  return useQuery({
    queryKey: destinationKeys.search(q),
    queryFn: () => destinationService.search(q),
    enabled: q.trim().length > 0,
  });
}

export function useDestination(id: string) {
  return useQuery({
    queryKey: destinationKeys.detail(id),
    queryFn: () => destinationService.findOne(id),
    enabled: !!id,
  });
}

export function useCreateDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: CreateDestinationPayload) => destinationService.create(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: destinationKeys.lists() });
      toast.success('Destination créée');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useUpdateDestination(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: UpdateDestinationPayload) => destinationService.update(id, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: destinationKeys.detail(id) });
      qc.invalidateQueries({ queryKey: destinationKeys.lists() });
      toast.success('Destination mise à jour');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useRemoveDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => destinationService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: destinationKeys.lists() }),
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useRestoreDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => destinationService.restore(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: destinationKeys.lists() }),
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useHardDeleteDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => destinationService.hardDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: destinationKeys.lists() }),
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useCleanupDestinationImages() {
  return useMutation({
    mutationFn: destinationService.cleanupImages,
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useDestinationsRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = getSocket('destinations');

    const onCreated = () => qc.invalidateQueries({ queryKey: destinationKeys.lists() });
    const onUpdated = (d: DestinationResponse) => {
      qc.setQueryData(destinationKeys.detail(d.id), d);
      qc.invalidateQueries({ queryKey: destinationKeys.lists() });
    };
    const onDeleted = () => qc.invalidateQueries({ queryKey: destinationKeys.all });

    socket.on('destination:created', onCreated);
    socket.on('destination:updated', onUpdated);
    socket.on('destination:deleted', onDeleted);

    return () => {
      socket.off('destination:created', onCreated);
      socket.off('destination:updated', onUpdated);
      socket.off('destination:deleted', onDeleted);
    };
  }, [qc]);
}
