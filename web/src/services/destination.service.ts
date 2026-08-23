import { apiClient } from '@/src/lib/api-client';
import type {
  CreateDestinationPayload,
  DestinationResponse,
  UpdateDestinationPayload,
} from '@/src/types/destination';

function buildFormData(
  data: Partial<{ country: string; description: string; consultantIds: string[] }>,
  imageFile?: File,
) {
  const fd = new FormData();
  if (data.country !== undefined) fd.append('country', data.country);
  if (data.description !== undefined) fd.append('description', data.description);
  data.consultantIds?.forEach((id) => fd.append('consultantIds[]', id));
  if (imageFile) fd.append('image', imageFile);
  return fd;
}

export const destinationService = {
  findAll: async () => (await apiClient.get<DestinationResponse[]>('/destinations/all')).data,
  search: async (q: string) => (await apiClient.get<DestinationResponse[]>('/destinations/search', { params: { q } })).data,
  findOne: async (id: string) => (await apiClient.get<DestinationResponse>(`/destinations/${id}`)).data,
  findOneAdmin: async (id: string) => (await apiClient.get<DestinationResponse>(`/admin/destinations/${id}`)).data,
  create: async (p: CreateDestinationPayload) =>
    (
      await apiClient.post<DestinationResponse>('/admin/destinations', buildFormData(p, p.imageFile), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data,
  update: async (id: string, p: UpdateDestinationPayload) =>
    (
      await apiClient.put<DestinationResponse>(`/admin/destinations/${id}`, buildFormData(p, p.imageFile), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data,
  remove: async (id: string) => (await apiClient.delete<{ message: string }>(`/admin/destinations/${id}`)).data,
  restore: async (id: string) => (await apiClient.post<DestinationResponse>(`/admin/destinations/${id}/restore`)).data,
  hardDelete: async (id: string) => (await apiClient.delete<{ message: string }>(`/admin/destinations/${id}/hard`)).data,
  cleanupImages: async () => (await apiClient.post<{ message: string; deletedFiles: string[] }>('/admin/destinations/cleanup-images')).data,
};
