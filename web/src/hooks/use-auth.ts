'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authService } from '@/src/services/auth.service';
import { useAuthStore } from '@/src/stores/auth-store';
import { extractErrorMessage } from '@/src/lib/api-client';
import type { LoginPayload, RegisterPayload } from '@/src/types/auth';

import { useRouter } from 'next/navigation';
import { UserRole } from '@/src/types/enums';

const ROLE_DESTINATIONS: Record<UserRole, string> = {
  [UserRole.ADMIN]: '/admin/mon-profil',
  [UserRole.CONSULTANT]: '/consultant/mon-profil',
  [UserRole.ETUDIANT]: '/etudiant/mon-profil',
};

export function useLogin() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: LoginPayload) => authService.login(p),
    onSuccess: (user) => {
      setUser(user);
      qc.invalidateQueries();
      toast.success('Connexion réussie');
      router.push(ROLE_DESTINATIONS[user.role] || '/');
    },
    onError: (e) => {
      toast.error(extractErrorMessage(e).message);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (p: RegisterPayload) => authService.register(p),
    onSuccess: () => {
      toast.success('Compte créé — connectez-vous');
    },
    onError: (e) => {
      toast.error(extractErrorMessage(e).message);
    },
  });
}

export function useLogout() {
  const clearUser = useAuthStore((s) => s.clearUser);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      clearUser();
      qc.clear();
      toast.success('Déconnexion effectuée');
    },
    onError: (e) => {
      toast.error(extractErrorMessage(e).message);
    },
  });
}

export function useLogoutAll() {
  const clearUser = useAuthStore((s) => s.clearUser);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authService.logoutAll(),
    onSuccess: () => {
      clearUser();
      qc.clear();
      toast.success('Toutes les sessions fermées');
    },
    onError: (e) => {
      toast.error(extractErrorMessage(e).message);
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: authService.forgotPassword,
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (e) => {
      toast.error(extractErrorMessage(e).message);
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: authService.resetPassword,
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (e) => {
      toast.error(extractErrorMessage(e).message);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: authService.changePassword,
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (e) => {
      toast.error(extractErrorMessage(e).message);
    },
  });
}

export function useCurrentUser() {
  return useAuthStore((s) => s.user);
}
