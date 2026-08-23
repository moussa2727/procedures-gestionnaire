import { create } from 'zustand';
import { disconnectAllSockets } from '@/src/lib/socket-client';
import type { AuthenticatedUser } from '@/src/types/auth';
import { UserRole } from '@/src/types/enums';

interface AuthState {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setUser: (user: AuthenticatedUser | null) => void;
  clearUser: () => void;
  setHydrated: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

// Aucune persistance localStorage — la vraie session vit dans les cookies
// httpOnly backend. Ce store ne fait jamais autorité pour l'accès aux
// routes protégées (rôle des layouts serveur).
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isHydrated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user, isHydrated: true }),
  clearUser: () => {
    disconnectAllSockets();
    set({ user: null, isAuthenticated: false, isHydrated: true });
  },
  setHydrated: () => set({ isHydrated: true }),
  hasRole: (roles) => {
    const { user } = get();
    if (!user) return false;
    return Array.isArray(roles) ? roles.includes(user.role) : user.role === roles;
  },
}));
