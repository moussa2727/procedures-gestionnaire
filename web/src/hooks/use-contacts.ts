'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSocket } from '@/src/lib/socket-client';
import { useAuthStore } from '@/src/stores/auth-store';
import { UserRole } from '@/src/types/enums';
import { contactService } from '@/src/services/contact.service';
import { extractErrorMessage } from '@/src/lib/api-client';
import type {
  BulkOperationPayload,
  CreateContactPayload,
  FilterContactQuery,
  ReplyContactPayload,
} from '@/src/types/contact';

export const contactKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  list: (q: FilterContactQuery) => [...contactKeys.lists(), q] as const,
  detail: (id: string) => [...contactKeys.all, 'detail', id] as const,
  statistics: () => [...contactKeys.all, 'statistics'] as const,
  unreadCount: () => [...contactKeys.all, 'unread-count'] as const,
};

export function useCreateContact() {
  return useMutation({
    mutationFn: (p: CreateContactPayload) => contactService.create(p),
    onSuccess: () => toast.success('Message envoyé'),
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useContacts(q: FilterContactQuery = {}) {
  return useQuery({
    queryKey: contactKeys.list(q),
    queryFn: () => contactService.findAll(q),
  });
}

export function useContactStatistics() {
  return useQuery({
    queryKey: contactKeys.statistics(),
    queryFn: contactService.getStatistics,
  });
}

export function useContactUnreadCount() {
  return useQuery({
    queryKey: contactKeys.unreadCount(),
    queryFn: contactService.getUnreadCount,
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: contactKeys.detail(id),
    queryFn: () => contactService.findOne(id),
    enabled: !!id,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: contactKeys.all });
}

export function useMarkContactAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactService.markAsRead(id),
    onSuccess: () => invalidate(qc),
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useMarkAllContactsAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: contactService.markAllAsRead,
    onSuccess: () => invalidate(qc),
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useReplyContact(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: ReplyContactPayload) => contactService.reply(id, p),
    onSuccess: () => {
      invalidate(qc);
      toast.success('Réponse envoyée');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useArchiveContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactService.archive(id),
    onSuccess: () => invalidate(qc),
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useUnarchiveContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactService.unarchive(id),
    onSuccess: () => invalidate(qc),
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useRemoveContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactService.remove(id),
    onSuccess: () => invalidate(qc),
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

export function useBulkDeleteContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: BulkOperationPayload) => contactService.bulkDelete(p),
    onSuccess: () => invalidate(qc),
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });
}

// Namespace admin-only — à monter uniquement sous le layout admin.
export function useContactsRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const socket = getSocket('admin/contacts');
    if (!socket.connected) socket.connect();
    const onChange = () => invalidate(qc);
    ['contact:new', 'contact:updated', 'contact:deleted'].forEach((e) =>
      socket.on(e, onChange),
    );
    const isAdmin = useAuthStore.getState().hasRole(UserRole.ADMIN);
    if (isAdmin) {
      ['admin:contact:new', 'admin:contact:updated', 'admin:contact:deleted'].forEach((e) =>
        socket.on(e, onChange),
      );
    }
    return () => {
      ['contact:new', 'contact:updated', 'contact:deleted'].forEach((e) =>
        socket.off(e, onChange),
      );
      if (isAdmin) {
        ['admin:contact:new', 'admin:contact:updated', 'admin:contact:deleted'].forEach((e) =>
          socket.off(e, onChange),
        );
      }
    };
  }, [qc]);
}
