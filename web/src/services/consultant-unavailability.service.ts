import { apiClient } from '@/src/lib/api-client';
import type { CreateUnavailabilityPayload, UnavailabilityResponse } from '@/src/types/availability';

export const consultantUnavailabilityService = {
  createMine: async (p: CreateUnavailabilityPayload) =>
    (await apiClient.post<UnavailabilityResponse>('/consultant-unavailability/mine', p)).data,
  findMine: async () =>
    (await apiClient.get<UnavailabilityResponse[]>('/consultant-unavailability/mine')).data,
  createForConsultant: async (consultantId: string, p: CreateUnavailabilityPayload) =>
    (await apiClient.post<UnavailabilityResponse>(`/consultant-unavailability/admin/${consultantId}`, p)).data,
  findForConsultant: async (consultantId: string) =>
    (await apiClient.get<UnavailabilityResponse[]>(`/consultant-unavailability/admin/${consultantId}`)).data,
  findInRange: async (consultantId: string, start: string, end: string) =>
    (await apiClient.get<UnavailabilityResponse[]>('/consultant-unavailability/range', { params: { consultantId, start, end } })).data,
  remove: async (id: string) =>
    (await apiClient.delete(`/consultant-unavailability/${id}`)).data,
};
