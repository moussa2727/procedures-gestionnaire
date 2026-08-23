import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';

import { serverFetch, ServerFetchError } from '@/src/lib/api-server';
import { AuthHydrator } from '@/src/providers/(auth)/auth-hydrator';
import { UserRole } from '@/src/types/enums';
import { UserResponse } from '@/src/types/user';
import { AdminWebSocketProvider } from '@/src/providers/(websockets)/admin-websocket-provider';
import { AdminHeader } from '@/src/components/admin/common/AdminHeader';
import { AdminNavigation } from '@/src/components/admin/common/AdminNavigation';
import { getAdminMetadata } from '@/src/lib/metadata';

export const metadata: Metadata = getAdminMetadata('Tableau de bord', 'Administration de la plateforme Paname Consulting');

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  let user: UserResponse;

  try {
    user = await serverFetch<UserResponse>('/users/me');
  } catch (error) {
    if (error instanceof ServerFetchError && error.status === 401) {
      redirect('/login');
    }

    throw error;
  }

  if (user.role !== UserRole.ADMIN) {
    redirect('/');
  }

  return (
    <>
      <AuthHydrator user={user} />
      <AdminWebSocketProvider>
        <div className="admin-shell min-h-screen flex flex-col bg-slate-50/50 text-slate-900">
          <AdminHeader />
          <AdminNavigation />
          <main aria-label="Contenu principal administration" className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </AdminWebSocketProvider>
    </>
  );
}

