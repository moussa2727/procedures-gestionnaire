import type { ReactNode } from 'react';
import Link from 'next/link';
import { getAdminPageMetadata } from '@/src/lib/metadata';

export const generateMetadata = getAdminPageMetadata(
  'Utilisateurs',
  'Gestion des comptes, rôles et profils. Administration des consultants, étudiants et accès à la plateforme.',
  '/admin/utilisateurs',
  ['utilisateurs', 'comptes', 'rôles', 'profils', 'consultants', 'étudiants']
);

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <Link href="/admin" className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700">← Retour</Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Utilisateurs</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">Gestion des comptes, rôles et profils.</p>
        </div>
      </header>
      {children}
    </div>
  );
}
