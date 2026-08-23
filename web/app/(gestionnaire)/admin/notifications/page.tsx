// app/(gestionnaire)/admin/notifications/page.tsx
'use client';

import React, { useMemo, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminNotificationList } from '@/src/components/admin/notifications';
import {
  useMyNotifications,
  useNotificationUnreadCount,
  useNotificationsRealtime,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '@/src/hooks/use-notifications';
import type { NotificationResponse } from '@/src/types/notification';
import { NotificationType } from '@/src/types/enums';

// Types de notifications autorisés exclusivement pour l'administration et le système
const ADMIN_ALLOWED_NOTIFICATION_TYPES = new Set<string>([
  NotificationType.SYSTEM,
  NotificationType.ACCOUNT_PROMOTED,
  NotificationType.ACCOUNT_LOCKED,
  NotificationType.SESSION_REVOKED,
  NotificationType.CONTACT_NEW,
  NotificationType.CONTACT_REPLIED,
  NotificationType.DESTINATION_CREATED,
  NotificationType.DESTINATION_UPDATED,
  NotificationType.DESTINATION_SOFT_DELETED,
  NotificationType.DESTINATION_RESTORED,
  NotificationType.DESTINATION_HARD_DELETED,
  NotificationType.CONSULTANT_ABSENCE_DECLARED,
  NotificationType.REVIEW_RECEIVED,
  NotificationType.REVIEW_RESPONSE,
  NotificationType.RENDEZVOUS_CREATED,
  NotificationType.RENDEZVOUS_RESCHEDULED,
  NotificationType.RENDEZVOUS_CANCELLED,
  NotificationType.PROCEDURE_CREATED,
  NotificationType.PROCEDURE_STEP_COMPLETED,
  NotificationType.PROCEDURE_STEP_REJECTED,
  NotificationType.PROCEDURE_COMPLETED,
  NotificationType.PROCEDURE_REJECTED,
  NotificationType.PROCEDURE_CANCELLED,
  NotificationType.FOLLOWUP_CREATED,
  NotificationType.FOLLOWUP_RESCHEDULED,
  NotificationType.FOLLOWUP_CANCELLED,
  NotificationType.FOLLOWUP_COMPLETED,
]);

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  // 1. Activer les notifications en temps réel
  useNotificationsRealtime();

  // 2. Récupération des notifications
  const { data: notificationsData, isLoading, refetch: refetchNotifications } =
    useMyNotifications(page, 50);
  const { refetch: refetchUnread } = useNotificationUnreadCount();

  // 3. Filtrage exclusif des notifications système et administrateur
  const notifications = useMemo<NotificationResponse[]>(() => {
    if (!notificationsData) return [];
    const list = Array.isArray(notificationsData)
      ? notificationsData
      : Array.isArray((notificationsData as any).items)
      ? (notificationsData as any).items
      : [];

    return list.filter((n: NotificationResponse) =>
      ADMIN_ALLOWED_NOTIFICATION_TYPES.has(n.type)
    );
  }, [notificationsData]);

  // 4. Mutations
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

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
        destination: `${basePath}/destinations/${entityId}`,
      };

      const path = routes[entity.toLowerCase()];
      if (path) {
        router.push(path);
      }
    },
    [router]
  );

  return (
    <div className="space-y-6">
      <AdminNotificationList
        notifications={notifications}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

