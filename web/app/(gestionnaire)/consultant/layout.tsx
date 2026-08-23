import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { serverFetch, ServerFetchError } from '@/src/lib/api-server';
import { AuthHydrator } from '@/src/providers/(auth)/auth-hydrator';
import { UserRole } from '@/src/types/enums';
import { UserResponse } from '@/src/types/user';
import { ConsultantWebSocketProvider } from '@/src/providers/(websockets)/consultant-websocket-provider';
import { getConsultantMetadata } from '@/src/lib/metadata';

export const metadata: Metadata = getConsultantMetadata('Tableau de bord', 'Espace consultant Paname Consulting. Gérez vos rendez-vous, avis et procédures d\'orientation.');


export default async function ConsultantLayout({
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

  if (user.role !== UserRole.CONSULTANT) {
    redirect('/');
  }

  const navItems = [
    { href: '/consultant/mon-profil', label: 'Mon profil' },
    { href: '/consultant/absences', label: 'Mes absences' },
    { href: '/consultant/mes-consultations', label: 'Mes consultations' },
    { href: '/consultant/procedures', label: 'Procédures' },
    { href: '/consultant/mes-etudiants', label: 'Mes étudiants' },
    { href: '/consultant/mes-statistiques', label: 'Mes statistiques' },
    { href: '/consultant/notifications', label: 'Notifications' },
  ];

  return (
    <>
      <AuthHydrator user={user} />
      <ConsultantWebSocketProvider>
        <div className="consultant-shell min-h-screen bg-slate-100 text-slate-900">
          <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-sky-700">Consultant</p>
                <h1 className="text-lg font-semibold text-slate-900">Espace consultant</h1>
              </div>
              <nav aria-label="Navigation consultant" className="hidden flex-wrap items-center gap-3 md:flex">
                {navItems.map((item) => (
                  <a key={item.href} href={item.href} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:border-sky-300 hover:text-sky-700">
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </header>
          <main aria-label="Contenu principal consultant" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </ConsultantWebSocketProvider>
    </>
  );
}