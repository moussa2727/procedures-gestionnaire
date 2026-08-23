import { apiClient } from '@/src/lib/api-client';
import type {
  CancelRendezVousPayload,
  CreateRendezVousPayload,
  RendezVousResponse,
  RescheduleRendezVousPayload,
  SetOpinionPayload,
} from '@/src/types/rendez-vous';

export const rendezVousService = {
  create: async (p: CreateRendezVousPayload) =>
    (await apiClient.post<RendezVousResponse>('/rendez-vous', p)).data,
  findMine: async () => (await apiClient.get<RendezVousResponse[]>('/rendez-vous/mine')).data,
  findMineAsConsultant: async () => (await apiClient.get<RendezVousResponse[]>('/rendez-vous/consultant/mine')).data,
  findAllAdmin: async () => (await apiClient.get<RendezVousResponse[]>('/rendez-vous/admin/all')).data,
  findOne: async (id: string) =>
    (await apiClient.get<RendezVousResponse>(`/rendez-vous/${id}`)).data,
  reschedule: async (id: string, p: RescheduleRendezVousPayload) =>
    (await apiClient.patch<RendezVousResponse>(`/rendez-vous/${id}/reschedule`, p)).data,
  cancel: async (id: string, p: CancelRendezVousPayload) =>
    (await apiClient.patch<RendezVousResponse>(`/rendez-vous/${id}/cancel`, p)).data,
  complete: async (id: string) =>
    (await apiClient.patch<RendezVousResponse>(`/rendez-vous/${id}/complete`)).data,
  setOpinion: async (id: string, p: SetOpinionPayload) =>
    (await apiClient.patch<RendezVousResponse>(`/rendez-vous/${id}/opinion`, p)).data,
};
