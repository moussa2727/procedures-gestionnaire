import type { ReactNode } from 'react';
import Link from 'next/link';
import { getAdminPageMetadata } from '@/src/lib/metadata';

export const generateMetadata = getAdminPageMetadata(
  'Notifications',
  'Signalements et alertes système. Restez informé des événements importants de la plateforme.',
  '/admin/notifications',
  ['notifications', 'alertes', 'signalements', 'système']
);

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <Link href="/admin" className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700">← Retour</Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Notifications</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">Signalements et alertes système.</p>
        </div>
      </header>
      {children}
    </div>
  );
}
