'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSocket } from '@/src/lib/socket-client';
import { useAuthStore } from '@/src/stores/auth-store';
import { UserRole } from '@/src/types/enums';
import { procedureService } from '@/src/services/procedure.service';
import { extractErrorMessage } from '@/src/lib/api-client';
import { followUpMeetingKeys } from './use-follow-up-meeting';
import type {
  CreateCommentPayload,
  CreateProcedurePayload,
  ProcedureResponse,
  UpdateStepPayload,
} from '@/src/types/procedure';

export const procedureKeys = {
  all: ['procedure'] as const,
  mine: () => [...procedureKeys.all, 'mine'] as const,
  mineConsultant: () => [...procedureKeys.all, 'mine-consultant'] as const,
  allAdmin: () => [...procedureKeys.all, 'admin-all'] as const,
  byDossier: (n: string) => [...procedureKeys.all, 'dossier', n] as const,
  detail: (id: string) => [...procedureKeys.all, 'detail', id] as const,
};

function invalidate(qc: ReturnType<typeof useQueryClient>, id?: string) {
  if (id) qc.invalidateQueries({ queryKey: procedureKeys.detail(id) });
  qc.invalidateQueries({ queryKey: procedureKeys.mine() });
  qc.invalidateQueries({ queryKey: procedureKeys.mineConsultant() });
  qc.invalidateQueries({ queryKey: procedureKeys.allAdmin() });
  if (id) qc.invalidateQueries({ queryKey: followUpMeetingKeys.forProcedure(id) });
}

export function useMyProcedures() {
  return useQuery({
    queryKey: procedureKeys.mine(),
    queryFn: procedureService.findMine,
  });
}

export function useMyProceduresAsConsultant() {
  return useQuery({
    queryKey: procedureKeys.mineConsultant(),
    queryFn: procedureService.findMineAsConsultant,
  });
}

export function useAllProceduresAdmin() {
  return useQuery({
    queryKey: procedureKeys.allAdmin(),
    queryFn: procedureService.findAllAdmin,
  });
}

export function useProcedureByDossier(n: string) {
  return useQuery({
    queryKey: procedureKeys.byDossier(n),
    queryFn: () => procedureService.findByNumeroDossier(n),
    enabled: !!n,
  });
}

export function useProcedure(id: string) {
  return useQuery({
    queryKey: procedureKeys.detail(id),
    queryFn: () => procedureService.findOne(id),
    enabled: !!id,
  });
}

export function useCreateProcedure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: CreateProcedurePayload) => procedureService.create(p),
    onSuccess: () => {
      invalidate(qc);
      toast.success('Procédure créée');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useUpdateStep(procedureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, payload }: { stepId: string; payload: UpdateStepPayload }) =>
      procedureService.updateStep(procedureId, stepId, payload),
    onSuccess: () => {
      invalidate(qc, procedureId);
      toast.success('Étape mise à jour');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useCompleteProcedure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => procedureService.complete(id),
    onSuccess: (_d, id) => {
      invalidate(qc, id);
      toast.success('Procédure terminée');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useRejectProcedure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => procedureService.reject(id, { reason }),
    onSuccess: (_d, { id }) => {
      invalidate(qc, id);
      toast.success('Procédure rejetée');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useCancelProcedure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => procedureService.cancel(id, { reason }),
    onSuccess: (_d, { id }) => {
      invalidate(qc, id);
      toast.success('Procédure annulée');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useAddProcedureComment(procedureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: CreateCommentPayload) => procedureService.addComment(procedureId, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: procedureKeys.detail(procedureId) }),
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useDeleteProcedureComment(procedureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => procedureService.deleteComment(procedureId, commentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: procedureKeys.detail(procedureId) }),
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useProcedureRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const socket = getSocket('procedure');
    if (!socket.connected) socket.connect();
    const isAdmin = useAuthStore.getState().hasRole(UserRole.ADMIN);
    const onProcedureEvent = (p: ProcedureResponse) => {
      qc.setQueryData(procedureKeys.detail(p.id), p);
      invalidate(qc, p.id);
    };
    const onStepUpdated = (payload: { procedure: ProcedureResponse }) =>
      invalidate(qc, payload.procedure.id);
    const onStepsCascaded = (payload: { procedureId: string }) =>
      invalidate(qc, payload.procedureId);
    socket.on('procedure:created', onProcedureEvent);
    socket.on('procedure:completed', onProcedureEvent);
    socket.on('procedure:rejected', onProcedureEvent);
    socket.on('procedure:cancelled', onProcedureEvent);
    socket.on('procedure:step-updated', onStepUpdated);
    socket.on('procedure:steps-cascaded-rejection', onStepsCascaded);
    if (isAdmin) {
      socket.on('admin:procedure:created', onProcedureEvent);
      socket.on('admin:procedure:completed', onProcedureEvent);
      socket.on('admin:procedure:rejected', onProcedureEvent);
      socket.on('admin:procedure:cancelled', onProcedureEvent);
    }
    return () => {
      socket.off('procedure:created', onProcedureEvent);
      socket.off('procedure:completed', onProcedureEvent);
      socket.off('procedure:rejected', onProcedureEvent);
      socket.off('procedure:cancelled', onProcedureEvent);
      socket.off('procedure:step-updated', onStepUpdated);
      socket.off('procedure:steps-cascaded-rejection', onStepsCascaded);
      if (isAdmin) {
        socket.off('admin:procedure:created', onProcedureEvent);
        socket.off('admin:procedure:completed', onProcedureEvent);
        socket.off('admin:procedure:rejected', onProcedureEvent);
        socket.off('admin:procedure:cancelled', onProcedureEvent);
      }
    };
  }, [qc]);
}
