import type { ReactNode } from 'react';
import Link from 'next/link';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <Link href="/consultant" className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700">← Retour</Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Consultant</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Mes étudiants</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">Liste des étudiants accompagnés.</p>
        </div>
      </header>
      {children}
    </div>
  );
}
