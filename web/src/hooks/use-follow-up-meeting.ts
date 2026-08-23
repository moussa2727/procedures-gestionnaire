'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSocket } from '@/src/lib/socket-client';
import { useAuthStore } from '@/src/stores/auth-store';
import { UserRole } from '@/src/types/enums';
import { followUpMeetingService } from '@/src/services/follow-up-meeting.service';
import { extractErrorMessage } from '@/src/lib/api-client';
import { procedureKeys } from './use-procedure';
import type {
  CancelFollowUpMeetingPayload,
  CreateFollowUpMeetingPayload,
  FollowUpMeetingResponse,
  RescheduleFollowUpMeetingPayload,
} from '@/src/types/follow-up-meeting';

export const followUpMeetingKeys = {
  all: ['follow-up-meeting'] as const,
  mine: () => [...followUpMeetingKeys.all, 'mine'] as const,
  mineConsultant: () => [...followUpMeetingKeys.all, 'mine-consultant'] as const,
  forProcedure: (id: string) => [...followUpMeetingKeys.all, 'procedure', id] as const,
  detail: (id: string) => [...followUpMeetingKeys.all, 'detail', id] as const,
};

function invalidate(qc: ReturnType<typeof useQueryClient>, procedureId?: string) {
  qc.invalidateQueries({ queryKey: followUpMeetingKeys.mine() });
  qc.invalidateQueries({ queryKey: followUpMeetingKeys.mineConsultant() });
  if (procedureId) {
    qc.invalidateQueries({ queryKey: followUpMeetingKeys.forProcedure(procedureId) });
    qc.invalidateQueries({ queryKey: procedureKeys.detail(procedureId) });
  }
}

export function useFollowUpMeetingsForProcedure(procedureId: string) {
  return useQuery({
    queryKey: followUpMeetingKeys.forProcedure(procedureId),
    queryFn: () => followUpMeetingService.findAllForProcedure(procedureId),
    enabled: !!procedureId,
  });
}

export function useMyFollowUpMeetings() {
  return useQuery({
    queryKey: followUpMeetingKeys.mine(),
    queryFn: followUpMeetingService.findMine,
  });
}

export function useMyFollowUpMeetingsAsConsultant() {
  return useQuery({
    queryKey: followUpMeetingKeys.mineConsultant(),
    queryFn: followUpMeetingService.findMineAsConsultant,
  });
}

export function useFollowUpMeeting(id: string) {
  return useQuery({
    queryKey: followUpMeetingKeys.detail(id),
    queryFn: () => followUpMeetingService.findOne(id),
    enabled: !!id,
  });
}

export function useCreateFollowUpMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: CreateFollowUpMeetingPayload) => followUpMeetingService.create(p),
    onSuccess: (d) => {
      invalidate(qc, d.procedureId);
      toast.success('Rendez-vous de suivi créé');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useRescheduleFollowUpMeeting(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: RescheduleFollowUpMeetingPayload) => followUpMeetingService.reschedule(id, p),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: followUpMeetingKeys.detail(id) });
      invalidate(qc, d.procedureId);
      toast.success('Rendez-vous de suivi replanifié');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useCancelFollowUpMeeting(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: CancelFollowUpMeetingPayload) => followUpMeetingService.cancel(id, p),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: followUpMeetingKeys.detail(id) });
      invalidate(qc, d.procedureId);
      toast.success('Rendez-vous de suivi annulé');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useCompleteFollowUpMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => followUpMeetingService.complete(id),
    onSuccess: (d, id) => {
      qc.invalidateQueries({ queryKey: followUpMeetingKeys.detail(id) });
      invalidate(qc, d.procedureId);
      toast.success('Rendez-vous de suivi terminé');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useFollowUpMeetingRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const socket = getSocket('follow-up-meeting');
    if (!socket.connected) socket.connect();
    const isAdmin = useAuthStore.getState().hasRole(UserRole.ADMIN);
    const onEvent = (m: FollowUpMeetingResponse) => {
      qc.setQueryData(followUpMeetingKeys.detail(m.id), m);
      invalidate(qc, m.procedureId);
    };
    [
      'follow-up-meeting:created',
      'follow-up-meeting:rescheduled',
      'follow-up-meeting:cancelled',
      'follow-up-meeting:completed',
    ].forEach((evt) => socket.on(evt, onEvent));
    if (isAdmin) {
      [
        'admin:follow-up-meeting:created',
        'admin:follow-up-meeting:rescheduled',
        'admin:follow-up-meeting:cancelled',
        'admin:follow-up-meeting:completed',
      ].forEach((evt) => socket.on(evt, onEvent));
    }
    return () => {
      [
        'follow-up-meeting:created',
        'follow-up-meeting:rescheduled',
        'follow-up-meeting:cancelled',
        'follow-up-meeting:completed',
      ].forEach((evt) => socket.off(evt, onEvent));
      if (isAdmin) {
        [
          'admin:follow-up-meeting:created',
          'admin:follow-up-meeting:rescheduled',
          'admin:follow-up-meeting:cancelled',
          'admin:follow-up-meeting:completed',
        ].forEach((evt) => socket.off(evt, onEvent));
      }
    };
  }, [qc]);
}
