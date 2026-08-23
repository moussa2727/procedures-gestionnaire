// src/providers/(auth)/auth-provider.tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { useAuthStore } from '../../stores/auth-store';
import { userService } from '../../services/user.service';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, setUser, clearUser, setHydrated } = useAuthStore();

  useEffect(() => {
    // Si l'utilisateur est déjà chargé (par exemple par AuthHydrator dans les layouts de rôle)
    if (user) {
      setHydrated();
      return;
    }

    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const profile = await userService.getMyProfile();
        if (isMounted) {
          setUser({
            id: profile.id,
            email: profile.email,
            role: profile.role,
            firstName: profile.firstName,
            lastName: profile.lastName,
          });
        }
      } catch {
        if (isMounted) {
          clearUser();
        }
      } finally {
        if (isMounted) {
          setHydrated();
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [user, setUser, clearUser, setHydrated]);

  return <>{children}</>;
}