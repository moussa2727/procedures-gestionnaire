'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/src/lib/socket-client';
import { notificationService } from '@/src/services/notification.service';
import { useNotificationStore } from '@/src/stores/notification-store';
import type { NotificationResponse } from '@/src/types/notification';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (page: number) => [...notificationKeys.all, 'list', page] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

export function useMyNotifications(page = 1, limit = 20) {
  return useQuery({
    queryKey: notificationKeys.list(page),
    queryFn: () => notificationService.findMine(page, limit),
  });
}

export function useNotificationUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: notificationService.getUnreadCount,
  });
}

export function useMarkNotificationAsRead() {
  const qc = useQueryClient();
  const markAsReadLocally = useNotificationStore((s) => s.markAsReadLocally);
  return useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: (_d, id) => {
      markAsReadLocally(id);
      qc.setQueryData(notificationKeys.unreadCount(), (old: { count: number } | undefined) => ({
        count: Math.max(0, (old?.count ?? 1) - 1),
      }));
      qc.invalidateQueries({
        queryKey: ['notifications'],
        predicate: (query) => query.queryKey[1] === 'list',
      });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const qc = useQueryClient();
  const markAllAsReadLocally = useNotificationStore((s) => s.markAllAsReadLocally);
  return useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      markAllAsReadLocally();
      qc.setQueryData(notificationKeys.unreadCount(), { count: 0 });
      qc.invalidateQueries({
        queryKey: ['notifications'],
        predicate: (query) => query.queryKey[1] === 'list',
      });
    },
  });
}

// Seul point d'entrée vers useNotificationStore — monté une fois,
// globalement, jamais dans un hook de domaine.
export function useNotificationsRealtime() {
  const qc = useQueryClient();
  const pushNotification = useNotificationStore((s) => s.pushNotification);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  useEffect(() => {
    const socket = getSocket('notifications');
    if (!socket.connected) socket.connect();

    const onNew = (n: NotificationResponse) => {
      pushNotification(n);
      const nextCount = useNotificationStore.getState().unreadCount + 1;
      setUnreadCount(nextCount);
      qc.setQueryData(notificationKeys.unreadCount(), { count: nextCount });
      qc.invalidateQueries({
        queryKey: ['notifications'],
        predicate: (query) => query.queryKey[1] === 'list',
      });
    };
    const onUnreadCount = (p: { count: number }) => {
      setUnreadCount(p.count);
      qc.setQueryData(notificationKeys.unreadCount(), { count: p.count });
    };
    socket.on('notification:new', onNew);
    socket.on('notification:unread-count', onUnreadCount);
    return () => {
      socket.off('notification:new', onNew);
      socket.off('notification:unread-count', onUnreadCount);
    };
  }, [qc, pushNotification, setUnreadCount]);
}
