import { create } from 'zustand';
import type { NotificationResponse } from '@/src/types/notification';

interface NotificationState {
  unreadCount: number;
  recent: NotificationResponse[];
  setUnreadCount: (count: number) => void;
  pushNotification: (n: NotificationResponse) => void;
  markAsReadLocally: (id: string) => void;
  markAllAsReadLocally: () => void;
}

const MAX_RECENT = 20;

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  recent: [],
  setUnreadCount: (count) => set({ unreadCount: count }),
  pushNotification: (n) => set((s) => ({ recent: [n, ...s.recent].slice(0, MAX_RECENT) })),
  markAsReadLocally: (id) =>
    set((s) => ({
      recent: s.recent.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    })),
  markAllAsReadLocally: () =>
    set((s) => ({
      recent: s.recent.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
}));
