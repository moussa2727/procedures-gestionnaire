import { apiClient } from '@/src/lib/api-client';
import type { PaginatedResult } from '@/src/types/common';
import type {
  BulkOperationPayload,
  ContactResponse,
  ContactStatistics,
  CreateContactPayload,
  FilterContactQuery,
  ReplyContactPayload,
} from '@/src/types/contact';

function qs(params: Record<string, unknown>) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== null && p.set(k, String(v)));
  return p.toString();
}

export const contactService = {
  create: async (p: CreateContactPayload) => (await apiClient.post<{ success: boolean }>('/contacts', p)).data,
  findAll: async (q: FilterContactQuery = {}) => (
    await apiClient.get<PaginatedResult<ContactResponse>>(
      `/contacts?${qs(q as Record<string, unknown>)}`
    )
  ).data,
  getStatistics: async () => (await apiClient.get<ContactStatistics>('/contacts/statistics')).data,
  getUnreadCount: async () => (await apiClient.get<{ count: number; unread: number }>('/contacts/unread-count')).data,
  findOne: async (id: string) => (await apiClient.get<ContactResponse>(`/contacts/${id}`)).data,
  markAsRead: async (id: string) => (await apiClient.patch<ContactResponse>(`/contacts/${id}/read`)).data,
  markAllAsRead: async () => (await apiClient.patch<{ count: number }>('/contacts/mark-all-read')).data,
  reply: async (id: string, p: ReplyContactPayload) => (await apiClient.patch<ContactResponse>(`/contacts/${id}/reply`, p)).data,
  archive: async (id: string) => (await apiClient.patch<ContactResponse>(`/contacts/${id}/archive`)).data,
  unarchive: async (id: string) => (await apiClient.patch<ContactResponse>(`/contacts/${id}/unarchive`)).data,
  remove: async (id: string) => (await apiClient.delete<{ success: boolean }>(`/contacts/${id}`)).data,
  bulkDelete: async (p: BulkOperationPayload) => (await apiClient.delete<{ deleted: number; failed: number; failedIds?: string[] }>('/contacts/bulk', { data: p })).data,
};
