// app/etudiant/layout.tsx
import { serverFetch, ServerFetchError } from '@/src/lib/api-server';
import { StudentWebSocketProvider } from '@/src/providers/(websockets)/student-websocket-provider';
import { AuthHydrator } from '@/src/providers/(auth)/auth-hydrator';
import { UserRole } from '@/src/types/enums';
import { UserResponse } from '@/src/types/user';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getStudentMetadata } from '@/src/lib/metadata';

export const metadata: Metadata = getStudentMetadata('Tableau de bord', 'Espace étudiant Paname Consulting. Gérez vos rendez-vous, procédures et consultations pour vos études à l\'étranger.');

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
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

  if (user.role !== UserRole.ETUDIANT) {
    redirect('/');
  }

  const navItems = [
    { href: '/etudiant/mon-profil', label: 'Mon profil' },
    { href: '/etudiant/procedures', label: 'Mes procédures' },
    { href: '/etudiant/mes-consultations', label: 'Mes consultations' },
    { href: '/etudiant/mes-rendez-vous', label: 'Mes rendez-vous' },
    { href: '/etudiant/notifications', label: 'Notifications' },
  ];

  return (
    <>
      <AuthHydrator user={user} />
      <StudentWebSocketProvider>
        <div className="student-shell min-h-screen bg-slate-50 text-slate-900">
          <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Étudiant</p>
                <h1 className="text-lg font-semibold text-slate-900">Espace étudiant</h1>
              </div>
              <nav aria-label="Navigation étudiant" className="hidden flex-wrap items-center gap-3 md:flex">
                {navItems.map((item) => (
                  <a key={item.href} href={item.href} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700">
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </header>
          <main aria-label="Contenu principal étudiant" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </StudentWebSocketProvider>
    </>
  );
}