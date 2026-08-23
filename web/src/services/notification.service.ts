import { apiClient } from '@/src/lib/api-client';
import type { NotificationListResult, NotificationResponse } from '@/src/types/notification';

export const notificationService = {
  findMine: async (page = 1, limit = 20) =>
    (await apiClient.get<NotificationListResult>('/notifications', { params: { page, limit } })).data,
  getUnreadCount: async () =>
    (await apiClient.get<{ count: number }>('/notifications/unread-count')).data,
  markAsRead: async (id: string) =>
    (await apiClient.patch<NotificationResponse>(`/notifications/${id}/read`)).data,
  markAllAsRead: async () =>
    (await apiClient.patch<{ updatedCount: number }>('/notifications/read-all')).data,
};
