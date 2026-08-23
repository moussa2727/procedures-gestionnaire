'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSocket } from '@/src/lib/socket-client';
import { consultantUnavailabilityService } from '@/src/services/consultant-unavailability.service';
import { extractErrorMessage } from '@/src/lib/api-client';
import { availabilityKeys } from './use-availability';
import type { CreateUnavailabilityPayload } from '@/src/types/availability';

export const unavailabilityKeys = {
  all: ['consultant-unavailability'] as const,
  mine: () => [...unavailabilityKeys.all, 'mine'] as const,
  forConsultant: (id: string) => [...unavailabilityKeys.all, 'consultant', id] as const,
};

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: unavailabilityKeys.all });
  qc.invalidateQueries({ queryKey: availabilityKeys.all });
}

export function useMyUnavailabilities() {
  return useQuery({
    queryKey: unavailabilityKeys.mine(),
    queryFn: consultantUnavailabilityService.findMine,
  });
}

export function useConsultantUnavailabilities(consultantId?: string) {
  return useQuery({
    queryKey: consultantId ? unavailabilityKeys.forConsultant(consultantId) : unavailabilityKeys.all,
    queryFn: () => consultantUnavailabilityService.findForConsultant(consultantId as string),
    enabled: !!consultantId,
  });
}

export function useCreateMyAbsence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: CreateUnavailabilityPayload) => consultantUnavailabilityService.createMine(p),
    onSuccess: () => {
      invalidate(qc);
      toast.success('Absence déclarée');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useCreateAbsenceForConsultant(consultantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: CreateUnavailabilityPayload) =>
      consultantUnavailabilityService.createForConsultant(consultantId, p),
    onSuccess: () => {
      invalidate(qc);
      toast.success('Absence déclarée pour le consultant');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useRemoveAbsence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => consultantUnavailabilityService.remove(id),
    onSuccess: () => {
      invalidate(qc);
      toast.success('Absence supprimée');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useConsultantUnavailabilityRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const socket = getSocket('consultant-unavailability');
    if (!socket.connected) socket.connect();
    const onChange = () => invalidate(qc);
    socket.on('unavailability:created', onChange);
    socket.on('unavailability:deleted', onChange);
    return () => {
      socket.off('unavailability:created', onChange);
      socket.off('unavailability:deleted', onChange);
    };
  }, [qc]);
}
