'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/src/stores/auth-store';
import type { UserResponse } from '@/src/types/user';

export function AuthHydrator({ user }: { user: UserResponse }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    setUser({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    });
    setHydrated();
  }, [user, setUser, setHydrated]);

  return null;
}
