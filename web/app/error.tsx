'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-slate-600">
          Une erreur inattendue s&apos;est produite. Veuillez réessayer.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Réessayer
        </button>
      </div>
    </main>
  );
}
