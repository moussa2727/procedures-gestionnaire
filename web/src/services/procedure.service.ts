import { apiClient } from '@/src/lib/api-client';
import type {
  CancelProcedurePayload,
  CreateCommentPayload,
  CreateProcedurePayload,
  ProcedureResponse,
  RejectProcedurePayload,
  UpdateStepPayload,
} from '@/src/types/procedure';

export const procedureService = {
  create: async (p: CreateProcedurePayload) =>
    (await apiClient.post<ProcedureResponse>('/procedure', p)).data,
  findMine: async () =>
    (await apiClient.get<ProcedureResponse[]>('/procedure/mine')).data,
  findMineAsConsultant: async () =>
    (await apiClient.get<ProcedureResponse[]>('/procedure/consultant/mine')).data,
  findAllAdmin: async () =>
    (await apiClient.get<ProcedureResponse[]>('/procedure/admin/all')).data,
  findByNumeroDossier: async (n: string) =>
    (await apiClient.get<ProcedureResponse>(`/procedure/dossier/${n}`)).data,
  findOne: async (id: string) =>
    (await apiClient.get<ProcedureResponse>(`/procedure/${id}`)).data,
  updateStep: async (procedureId: string, stepId: string, p: UpdateStepPayload) =>
    (await apiClient.patch<ProcedureResponse>(`/procedure/${procedureId}/steps/${stepId}`, p)).data,
  complete: async (id: string) =>
    (await apiClient.patch<ProcedureResponse>(`/procedure/${id}/complete`)).data,
  reject: async (id: string, p: RejectProcedurePayload) =>
    (await apiClient.patch<ProcedureResponse>(`/procedure/${id}/reject`, p)).data,
  cancel: async (id: string, p: CancelProcedurePayload) =>
    (await apiClient.patch<ProcedureResponse>(`/procedure/${id}/cancel`, p)).data,
  addComment: async (id: string, p: CreateCommentPayload) =>
    (await apiClient.post<ProcedureResponse>(`/procedure/${id}/comments`, p)).data,
  deleteComment: async (id: string, commentId: string) =>
    (await apiClient.delete(`/procedure/${id}/comments/${commentId}`)).data,
};
