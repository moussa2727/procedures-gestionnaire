// app/(auth)/layout.tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { serverFetch, ServerFetchError } from '@/src/lib/api-server';
import { UserRole } from '@/src/types/enums';
import { UserResponse } from '@/src/types/user';

export const metadata: Metadata = {
  title: 'Espace d\'inscription et de connexion utilisateur',
  robots: { index: false, follow: false },
};

const ROLE_DESTINATIONS: Record<UserRole, string> = {
  [UserRole.ADMIN]: '/admin/statistiques',
  [UserRole.CONSULTANT]: '/consultant/mon-profil',
  [UserRole.ETUDIANT]: '/etudiant/mon-profil',
};


export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token');

  if (accessToken) {
    try {
      const user = await serverFetch<UserResponse>('/users/me');
      redirect(ROLE_DESTINATIONS[user.role]);
    } catch (error) {
      if (error instanceof ServerFetchError && error.status === 401) {
        return <div className="auth-shell">{children}</div>;
      }
      throw error;
    }
  }

  return <div className="auth-shell">{children}</div>;
}