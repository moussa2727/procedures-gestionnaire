import { apiClient } from '@/src/lib/api-client';
import type {
  AuthenticatedUser,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
  ResetPasswordPayload,
} from '@/src/types/auth';
import type { ApiMessageResponse } from '@/src/types/common';

export const authService = {
  register: async (p: RegisterPayload) => (await apiClient.post<RegisterResponse>('/auth/register', p)).data,
  login: async (p: LoginPayload) => (await apiClient.post<AuthenticatedUser>('/auth/login', p)).data,
  logout: async () => (await apiClient.post<{ success: boolean }>('/auth/logout')).data,
  logoutAll: async () => (await apiClient.post<{ success: boolean }>('/auth/logout-all')).data,
  forgotPassword: async (p: ForgotPasswordPayload) => (await apiClient.post<ApiMessageResponse>('/auth/forgot-password', p)).data,
  resetPassword: async (p: ResetPasswordPayload) => (await apiClient.post<ApiMessageResponse>('/auth/reset-password', p)).data,
  changePassword: async (p: ChangePasswordPayload) => (await apiClient.post<ApiMessageResponse>('/auth/change-password', p)).data,
  googleLoginUrl: () => `${apiClient.defaults.baseURL}/auth/google`,
};
