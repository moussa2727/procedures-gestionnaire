'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSocket } from '@/src/lib/socket-client';
import { useAuthStore } from '@/src/stores/auth-store';
import { UserRole } from '@/src/types/enums';
import { rendezVousService } from '@/src/services/rendez-vous.service';
import { extractErrorMessage } from '@/src/lib/api-client';
import { availabilityKeys } from './use-availability';
import type {
  CancelRendezVousPayload,
  CreateRendezVousPayload,
  RendezVousResponse,
  RescheduleRendezVousPayload,
  SetOpinionPayload,
} from '@/src/types/rendez-vous';

export const rendezVousKeys = {
  all: ['rendez-vous'] as const,
  mine: () => [...rendezVousKeys.all, 'mine'] as const,
  mineConsultant: () => [...rendezVousKeys.all, 'mine-consultant'] as const,
  allAdmin: () => [...rendezVousKeys.all, 'admin-all'] as const,
  detail: (id: string) => [...rendezVousKeys.all, 'detail', id] as const,
};

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: rendezVousKeys.all });
  qc.invalidateQueries({ queryKey: availabilityKeys.all });
}

export function useMyRendezVous() {
  return useQuery({
    queryKey: rendezVousKeys.mine(),
    queryFn: rendezVousService.findMine,
  });
}

export function useMyRendezVousAsConsultant() {
  return useQuery({
    queryKey: rendezVousKeys.mineConsultant(),
    queryFn: rendezVousService.findMineAsConsultant,
  });
}

export function useAllRendezVousAdmin() {
  return useQuery({
    queryKey: rendezVousKeys.allAdmin(),
    queryFn: rendezVousService.findAllAdmin,
  });
}

export function useRendezVous(id: string) {
  return useQuery({
    queryKey: rendezVousKeys.detail(id),
    queryFn: () => rendezVousService.findOne(id),
    enabled: !!id,
  });
}

export function useCreateRendezVous() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: CreateRendezVousPayload) => rendezVousService.create(p),
    onSuccess: () => {
      invalidate(qc);
      toast.success('Rendez-vous confirmé');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useRescheduleRendezVous(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: RescheduleRendezVousPayload) => rendezVousService.reschedule(id, p),
    onSuccess: () => {
      invalidate(qc);
      toast.success('Rendez-vous replanifié');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useCancelRendezVous(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: CancelRendezVousPayload) => rendezVousService.cancel(id, p),
    onSuccess: () => {
      invalidate(qc);
      toast.success('Rendez-vous annulé');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useCompleteRendezVous() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rendezVousService.complete(id),
    onSuccess: () => {
      invalidate(qc);
      toast.success('Rendez-vous terminé');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useSetRendezVousOpinion(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: SetOpinionPayload) => rendezVousService.setOpinion(id, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rendezVousKeys.detail(id) });
      toast.success('Avis enregistré');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

// Ecoute plain + admin:* — RendezVousGateway émet via emitToUser
// (student/consultant) et emitToRoom(adminRoom), jamais emitToNamespace ;
// sans les admin:*, un dashboard admin ne se rafraîchit jamais.
export function useRendezVousRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const socket = getSocket('rendez-vous');
    if (!socket.connected) socket.connect();
    const isAdmin = useAuthStore.getState().hasRole(UserRole.ADMIN);
    const onEvent = (r: RendezVousResponse) => {
      qc.setQueryData(rendezVousKeys.detail(r.id), r);
      invalidate(qc);
    };
    socket.on('rendez-vous:created', onEvent);
    socket.on('rendez-vous:rescheduled', onEvent);
    socket.on('rendez-vous:cancelled', onEvent);
    if (isAdmin) {
      socket.on('admin:rendez-vous:created', onEvent);
      socket.on('admin:rendez-vous:rescheduled', onEvent);
      socket.on('admin:rendez-vous:cancelled', onEvent);
    }
    return () => {
      socket.off('rendez-vous:created', onEvent);
      socket.off('rendez-vous:rescheduled', onEvent);
      socket.off('rendez-vous:cancelled', onEvent);
      if (isAdmin) {
        socket.off('admin:rendez-vous:created', onEvent);
        socket.off('admin:rendez-vous:rescheduled', onEvent);
        socket.off('admin:rendez-vous:cancelled', onEvent);
      }
    };
  }, [qc]);
}
