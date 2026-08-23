'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { userService } from '@/src/services/user.service';
import { getSocket } from '@/src/lib/socket-client';
import { usePresenceStore } from '@/src/stores/presence-store';
import { extractErrorMessage } from '@/src/lib/api-client';
import { UserRole } from '@/src/types/enums';
import type {
  CreateReviewPayload,
  CreateUserPayload,
  ModerateReviewPayload,
  RespondReviewPayload,
  UpdateProfilePayload,
  UpdateUserPayload,
  UsersQuery,
} from '@/src/types/user';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (q: UsersQuery) => [...userKeys.lists(), q] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
  stats: () => [...userKeys.all, 'stats'] as const,
  me: () => [...userKeys.all, 'me'] as const,
  mySessions: () => [...userKeys.all, 'me', 'sessions'] as const,
  consultantsSemiPublic: () => [...userKeys.all, 'consultants-semi-public'] as const,
  consultantPublic: (id: string) => [...userKeys.all, 'consultant-public', id] as const,
  consultantStudents: (id: string) => [...userKeys.all, 'consultant-students', id] as const,
};

export function useUsers(q: UsersQuery = {}) {
  return useQuery({
    queryKey: userKeys.list(q),
    queryFn: () => userService.findAll(q),
  });
}

export function useUserStatistics() {
  return useQuery({
    queryKey: userKeys.stats(),
    queryFn: userService.getStatistics,
  });
}

export function useUsersByRole(role: UserRole) {
  return useQuery({
    queryKey: [...userKeys.lists(), 'role', role],
    queryFn: () => userService.findByRole(role),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userService.findOne(id),
    enabled: !!id,
  });
}

export function useMyProfile() {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: userService.getMyProfile,
  });
}

export function useMySessions() {
  return useQuery({
    queryKey: userKeys.mySessions(),
    queryFn: userService.listMySessions,
  });
}

export function useConsultantsSemiPublic() {
  return useQuery({
    queryKey: userKeys.consultantsSemiPublic(),
    queryFn: userService.listConsultantsSemiPublic,
  });
}

export function useConsultantPublicProfile(id: string) {
  return useQuery({
    queryKey: userKeys.consultantPublic(id),
    queryFn: () => userService.getConsultantPublicProfile(id),
    enabled: !!id,
  });
}

export function useConsultantStudents(id: string) {
  return useQuery({
    queryKey: userKeys.consultantStudents(id),
    queryFn: () => userService.getConsultantStudents(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: CreateUserPayload) => userService.create(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success('Utilisateur créé');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: UpdateUserPayload) => userService.update(id, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.detail(id) });
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success('Utilisateur mis à jour');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function usePromoteToConsultant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.promoteToConsultant(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: userKeys.detail(id) });
      qc.invalidateQueries({ queryKey: userKeys.lists() });
      qc.invalidateQueries({ queryKey: userKeys.consultantsSemiPublic() });
      toast.success('Promu consultant');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useToggleUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      userService.toggleStatus(id, isActive),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: userKeys.detail(id) });
      qc.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useRestoreUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.restore(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.lists() }),
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.lists() }),
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: UpdateProfilePayload) => userService.updateMyProfile(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.me() });
      toast.success('Profil mis à jour');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useUpdateMyPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => userService.updateMyPhoto(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.me() }),
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useRevokeMySession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => userService.revokeMySession(sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.mySessions() }),
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useCreateReview(consultantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: CreateReviewPayload) => userService.createReview(consultantId, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.consultantPublic(consultantId) }),
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useRespondToReview(consultantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, payload }: { reviewId: string; payload: RespondReviewPayload }) =>
      userService.respondToReview(reviewId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.consultantPublic(consultantId) }),
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useModerateReview() {
  return useMutation({
    mutationFn: ({ reviewId, payload }: { reviewId: string; payload: ModerateReviewPayload }) =>
      userService.moderateReview(reviewId, payload),
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useUsersRealtime() {
  const qc = useQueryClient();
  const setOnline = usePresenceStore((s) => s.setOnline);
  useEffect(() => {
    const socket = getSocket('users');
    if (!socket.connected) socket.connect();
    const onStatus = (p: { userId: string; isOnline: boolean }) => setOnline(p.userId, p.isOnline);
    const onUpdated = (p: { userId: string }) => {
      qc.invalidateQueries({ queryKey: userKeys.detail(p.userId) });
      qc.invalidateQueries({ queryKey: userKeys.lists() });
    };
    const onInvalidateAll = () => qc.invalidateQueries({ queryKey: userKeys.all });
    socket.on('status', onStatus);
    socket.on('userUpdated', onUpdated);
    socket.on('newReview', onInvalidateAll);
    socket.on('reviewResponse', onInvalidateAll);
    return () => {
      socket.off('status', onStatus);
      socket.off('userUpdated', onUpdated);
      socket.off('newReview', onInvalidateAll);
      socket.off('reviewResponse', onInvalidateAll);
    };
  }, [qc, setOnline]);
}
