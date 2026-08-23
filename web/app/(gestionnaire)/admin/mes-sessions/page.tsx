'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/src/stores/auth-store';
import { LoadingState, EmptyState } from '@/src/components/common';
import { userService } from '@/src/services/user.service';
import type { SessionResponse } from '@/src/types/user';
import { Monitor, Smartphone, Globe, MapPin, Clock, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function AdminMesSessionsPage() {
  const user = useAuthStore((s) => s.user);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const { data: sessions, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: () => userService.listMySessions(),
  });

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await userService.revokeMySession(sessionId);
      toast.success('Session révoquée');
      refetch();
    } catch {
      toast.error('Erreur lors de la révocation');
    } finally {
      setRevokingId(null);
    }
  };

  if (isLoading) return <LoadingState message="Chargement des sessions..." />;
  if (error) return <div className="p-6 text-center text-sm text-red-600">Erreur lors du chargement</div>;

  const sessionList = Array.isArray(sessions) ? sessions : [];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Mes sessions</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Gérez vos sessions actives et révoquez les accès que vous ne reconnaissez pas.
        </p>
      </header>

      {sessionList.length === 0 ? (
        <EmptyState title="Aucune session" description="Vous n'avez aucune session active." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sessionList.map((session: SessionResponse) => (
            <div
              key={session.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                  <Monitor className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {session.deviceInfo || 'Appareil inconnu'}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                    <Globe className="w-3 h-3" />
                    {session.ipAddress || 'IP inconnue'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(session.createdAt).toLocaleDateString('fr-FR')}
                </span>
                {!session.isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(session.id)}
                    disabled={revokingId === session.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-red-300 hover:text-red-600 text-slate-700 text-xs font-semibold rounded-lg transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    {revokingId === session.id ? 'Révocation...' : 'Révoquer'}
                  </button>
                )}
                {session.isCurrent && (
                  <span className="text-xs font-medium text-emerald-600">Session actuelle</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
