// components/admin/common/AdminHeader.tsx
'use client';

import React, { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, LogOut, User } from 'lucide-react';
import { AdminNotificationDropdown } from '@/src/components/admin/notifications';
import { useAuthStore } from '@/src/stores/auth-store';
import { useLogout } from '@/src/hooks/use-auth';
import {
  useMyNotifications,
  useNotificationUnreadCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '@/src/hooks/use-notifications';
import type { NotificationResponse } from '@/src/types/notification';

export function AdminHeader() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();

  // Récupération des notifications et du compteur non lu
  const { data: notificationsData, isLoading, refetch: refetchNotifications } =
    useMyNotifications(1, 10);
  const { data: unreadCountData, refetch: refetchUnread } =
    useNotificationUnreadCount();

  // 3. Formatage des notifications
  const notifications = useMemo<NotificationResponse[]>(() => {
    if (!notificationsData) return [];
    if (Array.isArray(notificationsData)) return notificationsData;
    if ('items' in notificationsData && Array.isArray(notificationsData.items)) {
      return notificationsData.items;
    }
    return [];
  }, [notificationsData]);

  const unreadCount = unreadCountData?.count ?? 0;

  // 4. Mutations
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  // 5. Handlers
  const handleMarkAsRead = useCallback(
    async (id: string) => {
      await markAsReadMutation.mutateAsync(id);
    },
    [markAsReadMutation]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsReadMutation.mutateAsync();
  }, [markAllAsReadMutation]);

  const handleRefresh = useCallback(() => {
    refetchNotifications();
    refetchUnread();
  }, [refetchNotifications, refetchUnread]);

  const handleNavigate = useCallback(
    (entityId?: string | null, entity?: string | null) => {
      if (!entity || !entityId) return;

      const basePath = '/admin';
      const routes: Record<string, string> = {
        rendezvous: `${basePath}/rendez-vous/${entityId}`,
        appointment: `${basePath}/rendez-vous/${entityId}`,
        procedure: `${basePath}/procedures/${entityId}`,
        user: `${basePath}/utilisateurs/${entityId}`,
        contact: `${basePath}/contacts/${entityId}`,
      };

      const path = routes[entity.toLowerCase()];
      if (path) {
        router.push(path);
      }
    },
    [router]
  );

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200/80 bg-white shadow-xs">
      <div className="flex items-center gap-3">
        <Link href="/admin/statistiques" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:bg-sky-600 transition-colors">
            EC
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm sm:text-base text-slate-900 leading-none">EduConseil</span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-md">
                <Shield className="w-2.5 h-2.5 text-sky-600" />
                Admin
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">Panneau de gestion & pilotage</p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification dropdown */}
        <AdminNotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          isLoading={isLoading}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onRefresh={handleRefresh}
          onNavigate={handleNavigate}
        />

        <div className="w-px h-6 bg-slate-200" />

        {/* Profil admin & déconnexion */}
        <Link
          href="/admin/mon-profil"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-xs font-medium text-slate-700"
        >
          <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
            {user?.firstName ? user.firstName.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
          </div>
          <span className="hidden md:inline font-semibold text-slate-800">
            {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Administrateur'}
          </span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          title="Déconnexion"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}