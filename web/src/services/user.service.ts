import { apiClient } from '@/src/lib/api-client';
import type { PaginatedResult } from '@/src/types/common';
import type {
  ConsultantPublicProfile,
  ConsultantSemiPublicProfile,
  CreateReviewPayload,
  CreateUserPayload,
  ModerateReviewPayload,
  RespondReviewPayload,
  SessionResponse,
  UpdateProfilePayload,
  UpdateUserPayload,
  UserResponse,
  UserStatistics,
  UsersQuery,
} from '@/src/types/user';
import { UserRole } from '@/src/types/enums';

function qs(params: Record<string, unknown>) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== null && p.set(k, String(v)));
  return p.toString();
}

export const userService = {
  findAll: async (q: UsersQuery = {}) => (
    await apiClient.get<PaginatedResult<UserResponse>>(
      `/users?${qs(q as Record<string, unknown>)}`
    )
  ).data,
  getStatistics: async () => (await apiClient.get<UserStatistics>('/users/stats')).data,
  findByRole: async (role: UserRole) => {
    try {
      const res = await apiClient.get<UserResponse[]>(`/users/role/${role}`);
      return res.data;
    } catch {
      return [];
    }
  },
  findOne: async (id: string) => (await apiClient.get<UserResponse>(`/users/${id}`)).data,
  create: async (p: CreateUserPayload) => (await apiClient.post<UserResponse>('/users', p)).data,
  update: async (id: string, p: UpdateUserPayload) => (await apiClient.put<UserResponse>(`/users/${id}`, p)).data,
  promoteToConsultant: async (id: string) => (await apiClient.patch<UserResponse>(`/users/${id}/promote-to-consultant`)).data,
  toggleStatus: async (id: string, isActive: boolean) => (await apiClient.patch<UserResponse>(`/users/${id}/status`, { isActive })).data,
  restore: async (id: string) => (await apiClient.patch<UserResponse>(`/users/${id}/restore`)).data,
  resetPassword: async (id: string, newPassword: string) => (await apiClient.post<{ message: string }>(`/users/${id}/reset-password`, { newPassword })).data,
  remove: async (id: string) => (await apiClient.delete<{ message: string }>(`/users/${id}`)).data,
  logoutAllUsers: async () => (await apiClient.post<{ affectedUsersCount: number }>('/users/admin/logout-all-users')).data,
  adminRevokeSession: async (userId: string, sessionId: string) => (await apiClient.delete<{ message: string }>(`/users/${userId}/sessions/${sessionId}`)).data,
  moderateReview: async (reviewId: string, p: ModerateReviewPayload) => (await apiClient.patch<{ success: boolean }>(`/users/reviews/${reviewId}/moderate`, p)).data,
  getMyProfile: async () => (await apiClient.get<UserResponse>('/users/me')).data,
  updateMyProfile: async (p: UpdateProfilePayload) => (await apiClient.put<UserResponse>('/users/me', p)).data,
  updateMyPhoto: async (file: File) => {
    const fd = new FormData();
    fd.append('photo', file);
    return (await apiClient.put<UserResponse>('/users/me/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
  listMySessions: async () => {
    try {
      const res = await apiClient.get<SessionResponse[]>('/users/me/sessions');
      return res.data;
    } catch {
      return [];
    }
  },
  revokeMySession: async (sessionId: string) => (await apiClient.delete<{ message: string }>(`/users/me/sessions/${sessionId}`)).data,
  listConsultantsSemiPublic: async () => {
    try {
      const res = await apiClient.get<ConsultantSemiPublicProfile[]>('/users/consultants');
      return res.data;
    } catch {
      return [];
    }
  },
  getMyConsultantProfile: async () => (await apiClient.get<UserResponse>('/users/consultant/me')).data,
  updateConsultantPhoto: async (file: File) => {
    const fd = new FormData();
    fd.append('photo', file);
    return (await apiClient.put<UserResponse>('/users/consultant/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
  getConsultantPublicProfile: async (id: string) => (await apiClient.get<ConsultantPublicProfile>(`/users/consultant/${id}/public`)).data,
  getConsultantStudents: async (id: string) => {
    try {
      const res = await apiClient.get<UserResponse[]>(`/users/consultant/${id}/students`);
      return res.data;
    } catch {
      return [];
    }
  },
  createReview: async (consultantId: string, p: CreateReviewPayload) => (await apiClient.post(`/users/consultant/${consultantId}/reviews`, p)).data,
  respondToReview: async (reviewId: string, p: RespondReviewPayload) => (await apiClient.post(`/users/reviews/${reviewId}/response`, p)).data,
};
