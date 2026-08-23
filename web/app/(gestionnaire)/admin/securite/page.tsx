'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/src/stores/auth-store';
import { LoadingState, EmptyState, ConfirmationModal } from '@/src/components/common';
import { userService } from '@/src/services/user.service';
import { useMySessions, useRevokeMySession } from '@/src/hooks/use-users';
import type { SessionResponse } from '@/src/types/user';
import { Monitor, Smartphone, Globe, MapPin, Clock, XCircle, RefreshCw, AlertTriangle, ShieldAlert, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function AdminSecuritePage() {
  const user = useAuthStore((s) => s.user);
  const [targetUserId, setTargetUserId] = useState('');
  const [targetSessionId, setTargetSessionId] = useState('');
  const [isRevokingTarget, setIsRevokingTarget] = useState(false);
  const [showGlobalLogoutModal, setShowGlobalLogoutModal] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  const { data: mySessions, isLoading, error, refetch } = useMySessions();
  const revokeMySessionMutation = useRevokeMySession();

  const handleGlobalLogout = async () => {
    setIsLoggingOutAll(true);
    try {
      await userService.logoutAllUsers();
      toast.success('Tous les utilisateurs ont été déconnectés du système');
      setShowGlobalLogoutModal(false);
      window.location.href = '/login';
    } catch {
      toast.error('Erreur lors de la déconnexion globale');
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  const handleRevokeTargetSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim() || !targetSessionId.trim()) {
      toast.error('Veuillez renseigner l\'ID utilisateur et l\'ID de session');
      return;
    }
    setIsRevokingTarget(true);
    try {
      await userService.adminRevokeSession(targetUserId.trim(), targetSessionId.trim());
      toast.success('Session utilisateur révoquée avec succès');
      setTargetUserId('');
      setTargetSessionId('');
    } catch {
      toast.error('Erreur lors de la révocation de la session');
    } finally {
      setIsRevokingTarget(false);
    }
  };

  const handleRevokeMySession = async (sessionId: string) => {
    try {
      await revokeMySessionMutation.mutateAsync(sessionId);
      toast.success('Session révoquée');
      refetch();
    } catch {
      toast.error('Erreur lors de la révocation');
    }
  };

  const sessionList = Array.isArray(mySessions) ? mySessions : [];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Sécurité & Sessions</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Contrôle global des sessions actives, révocation ciblée et sécurité du système.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mes sessions admin */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Mes sessions administratives actives</h3>
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:border-sky-300 hover:text-sky-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Actualiser
              </button>
            </div>

            {isLoading ? (
              <LoadingState message="Chargement des sessions..." />
            ) : error ? (
              <div className="p-6 text-center text-sm text-red-600">Erreur lors du chargement</div>
            ) : sessionList.length === 0 ? (
              <EmptyState title="Aucune session" description="Aucune session active répertoriée." />
            ) : (
              <div className="space-y-3">
                {sessionList.map((session: SessionResponse) => (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-xs">
                        <Monitor className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{session.deviceInfo || 'Appareil inconnu'}</p>
                          {session.isCurrent && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              Session courante
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          IP : {session.ipAddress || 'Non communiquée'} • Connecté le {new Date(session.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleRevokeMySession(session.id)}
                        disabled={revokeMySessionMutation.isPending}
                        className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Révoquer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Révocation ciblée */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="w-5 h-5 text-sky-700" />
              <h3 className="text-base font-bold text-slate-900">Révocation ciblée d'une session utilisateur</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Révoquez la session d'un utilisateur spécifique en saisissant son identifiant et l'ID de sa session.
            </p>
            <form onSubmit={handleRevokeTargetSession} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">ID Utilisateur</label>
                  <input
                    type="text"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    placeholder="ex: cly..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">ID Session</label>
                  <input
                    type="text"
                    value={targetSessionId}
                    onChange={(e) => setTargetSessionId(e.target.value)}
                    placeholder="ex: cly..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isRevokingTarget || !targetUserId.trim() || !targetSessionId.trim()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {isRevokingTarget ? 'Révocation en cours...' : 'Révoquer cette session'}
              </button>
            </form>
          </div>
        </div>

        {/* Zone de danger / Déconnexion globale */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-red-700">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-base font-bold">Sécurité globale</h3>
            </div>
            <p className="mt-2 text-xs text-red-800 leading-relaxed">
              En cas d'incident de sécurité, vous pouvez forcer la déconnexion de l'ensemble des comptes (étudiants, consultants, administrateurs).
            </p>
            <div className="mt-4 pt-4 border-t border-red-200">
              <button
                type="button"
                onClick={() => setShowGlobalLogoutModal(true)}
                className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Déconnecter tous les utilisateurs
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showGlobalLogoutModal}
        onClose={() => setShowGlobalLogoutModal(false)}
        onConfirm={handleGlobalLogout}
        title="Déconnecter tous les utilisateurs"
        subtitle="Cette action invalidera instantanément toutes les sessions actives sur l'ensemble de la plateforme. Vous serez également déconnecté."
        confirmLabel="Tout déconnecter"
        variant="danger"
      />
    </div>
  );
}
