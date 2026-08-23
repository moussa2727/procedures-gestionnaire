import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chargement...',
  robots: { index: false, follow: false },
};

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="flex items-center gap-3 text-slate-600">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600" />
        <p className="text-sm font-medium">Chargement...</p>
      </div>
    </main>
  );
}
