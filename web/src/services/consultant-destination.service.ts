import { apiClient } from '@/src/lib/api-client';
import type { ConsultantDestinationAssignment } from '@/src/types/consultant-destination';

export const consultantDestinationService = {
  assign: async (destinationId: string, consultantId: string) =>
    (await apiClient.post(`/admin/consultant-destinations/${destinationId}`, { consultantId })).data,
  remove: async (destinationId: string, consultantId: string) =>
    (await apiClient.delete(`/admin/consultant-destinations/${destinationId}/${consultantId}`)).data,
  listByDestination: async (destinationId: string) =>
    (await apiClient.get<ConsultantDestinationAssignment[]>(`/admin/consultant-destinations/destination/${destinationId}`)).data,
  listByConsultant: async (consultantId: string) =>
    (await apiClient.get<ConsultantDestinationAssignment[]>(`/admin/consultant-destinations/consultant/${consultantId}`)).data,
};
