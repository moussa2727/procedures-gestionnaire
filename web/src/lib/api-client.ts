import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/src/stores/auth-store';
import { getCsrfToken, clearCsrfToken } from './csrf';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000/api/v1';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Attach the double-submit CSRF token on every state-changing request.
apiClient.interceptors.request.use(async (config) => {
  if (MUTATING_METHODS.has((config.method ?? '').toUpperCase())) {
    try {
      const token = await getCsrfToken();
      config.headers.set('x-csrf-token', token);
    } catch {
      // If the token endpoint is unreachable we let the request proceed and
      // the backend will reject it with 400 Token CSRF manquant.
    }
  }
  return config;
});

async function performRefresh(): Promise<void> {
  await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      if (error.response?.status === 401) {
        useAuthStore.getState().clearUser();
        clearCsrfToken();
      }
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
      useAuthStore.getState().clearUser();
      clearCsrfToken();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = performRefresh().finally(() => {
          isRefreshing = false;
        });
      }
      await refreshPromise;
      clearCsrfToken();
      return apiClient(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().clearUser();
      clearCsrfToken();
      return Promise.reject(refreshError);
    }
  },
);

export interface ApiErrorShape {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export function extractErrorMessage(error: unknown): { status: number; message: string } {
  if (axios.isAxiosError<ApiErrorShape>(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data;
    const raw = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    const fallback: Record<number, string> = {
      400: 'Requête invalide',
      401: 'Session expirée, veuillez vous reconnecter',
      403: "Vous n'avez pas les droits nécessaires",
      404: 'Ressource introuvable',
      409: 'Conflit — action déjà effectuée',
      422: 'Données non valides',
      429: 'Trop de requêtes, veuillez patienter',
      500: 'Erreur serveur',
    };
    return { status, message: raw ?? fallback[status] ?? error.message };
  }
  if (error instanceof Error) {
    return { status: 0, message: error.message };
  }
  return { status: 0, message: 'Erreur inattendue' };
}
