import { apiClient } from '@/src/lib/api-client';
import type {
  CancelFollowUpMeetingPayload,
  CreateFollowUpMeetingPayload,
  FollowUpMeetingResponse,
  RescheduleFollowUpMeetingPayload,
} from '@/src/types/follow-up-meeting';

export const followUpMeetingService = {
  create: async (p: CreateFollowUpMeetingPayload) =>
    (await apiClient.post<FollowUpMeetingResponse>('/follow-up-meeting', p)).data,
  findAllForProcedure: async (procedureId: string) =>
    (await apiClient.get<FollowUpMeetingResponse[]>(`/follow-up-meeting/procedure/${procedureId}`)).data,
  findMine: async () =>
    (await apiClient.get<FollowUpMeetingResponse[]>('/follow-up-meeting/mine')).data,
  findMineAsConsultant: async () =>
    (await apiClient.get<FollowUpMeetingResponse[]>('/follow-up-meeting/consultant/mine')).data,
  findOne: async (id: string) =>
    (await apiClient.get<FollowUpMeetingResponse>(`/follow-up-meeting/${id}`)).data,
  reschedule: async (id: string, p: RescheduleFollowUpMeetingPayload) =>
    (await apiClient.patch<FollowUpMeetingResponse>(`/follow-up-meeting/${id}/reschedule`, p)).data,
  cancel: async (id: string, p: CancelFollowUpMeetingPayload) =>
    (await apiClient.patch<FollowUpMeetingResponse>(`/follow-up-meeting/${id}/cancel`, p)).data,
  complete: async (id: string) =>
    (await apiClient.patch<FollowUpMeetingResponse>(`/follow-up-meeting/${id}/complete`)).data,
};
