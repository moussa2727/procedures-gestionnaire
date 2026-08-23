// app/(gestionnaire)/consultant/notifications/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellOff,
  CheckCircle2,
  XCircle,
  Calendar,
  FileText,
  User,
  MessageSquare,
  Mail,
  Clock,
  Loader2,
  RefreshCw,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

// ===== HOOKS =====
import {
  useMyNotifications,
  useNotificationUnreadCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useNotificationsRealtime,
} from '@/src/hooks/use-notifications';

// ===== COMPOSANTS =====
import {
  LoadingState,
  EmptyState,
  SearchInput,
  FilterBar,
  KPIMetrics,
} from '@/src/components/common';

// ===== TYPES =====
import { NotificationType } from '@/src/types/enums';
import type { NotificationResponse } from '@/src/types/notification';

// ===== HELPERS =====
import { formatDateTime, formatRelativeDate } from '@/src/lib/date-helpers';

type NotificationFilter = 'ALL' | 'UNREAD' | 'READ';

const NOTIFICATION_ICONS: Record<NotificationType, React.ElementType> = {
  [NotificationType.RENDEZVOUS_CREATED]: Calendar,
  [NotificationType.RENDEZVOUS_RESCHEDULED]: Calendar,
  [NotificationType.RENDEZVOUS_CANCELLED]: XCircle,
  [NotificationType.FOLLOWUP_CREATED]: Calendar,
  [NotificationType.FOLLOWUP_RESCHEDULED]: Calendar,
  [NotificationType.FOLLOWUP_CANCELLED]: XCircle,
  [NotificationType.FOLLOWUP_COMPLETED]: CheckCircle2,
  [NotificationType.PROCEDURE_CREATED]: FileText,
  [NotificationType.PROCEDURE_STEP_COMPLETED]: CheckCircle2,
  [NotificationType.PROCEDURE_STEP_REJECTED]: XCircle,
  [NotificationType.PROCEDURE_COMPLETED]: CheckCircle2,
  [NotificationType.PROCEDURE_REJECTED]: XCircle,
  [NotificationType.PROCEDURE_CANCELLED]: XCircle,
  [NotificationType.DESTINATION_CREATED]: FileText,
  [NotificationType.DESTINATION_UPDATED]: FileText,
  [NotificationType.DESTINATION_SOFT_DELETED]: FileText,
  [NotificationType.DESTINATION_RESTORED]: FileText,
  [NotificationType.DESTINATION_HARD_DELETED]: FileText,
  [NotificationType.REVIEW_RECEIVED]: MessageSquare,
  [NotificationType.REVIEW_RESPONSE]: MessageSquare,
  [NotificationType.CONTACT_NEW]: Mail,
  [NotificationType.CONTACT_REPLIED]: Mail,
  [NotificationType.ACCOUNT_LOCKED]: User,
  [NotificationType.ACCOUNT_PROMOTED]: User,
  [NotificationType.SESSION_REVOKED]: User,
  [NotificationType.CONSULTANT_ABSENCE_DECLARED]: User,
  [NotificationType.SYSTEM]: Bell,
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  [NotificationType.RENDEZVOUS_CREATED]: 'bg-sky-50 border-sky-200 text-sky-700',
  [NotificationType.RENDEZVOUS_RESCHEDULED]: 'bg-amber-50 border-amber-200 text-amber-700',
  [NotificationType.RENDEZVOUS_CANCELLED]: 'bg-red-50 border-red-200 text-red-700',
  [NotificationType.FOLLOWUP_CREATED]: 'bg-sky-50 border-sky-200 text-sky-700',
  [NotificationType.FOLLOWUP_RESCHEDULED]: 'bg-amber-50 border-amber-200 text-amber-700',
  [NotificationType.FOLLOWUP_CANCELLED]: 'bg-red-50 border-red-200 text-red-700',
  [NotificationType.FOLLOWUP_COMPLETED]: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  [NotificationType.PROCEDURE_CREATED]: 'bg-sky-50 border-sky-200 text-sky-700',
  [NotificationType.PROCEDURE_STEP_COMPLETED]: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  [NotificationType.PROCEDURE_STEP_REJECTED]: 'bg-red-50 border-red-200 text-red-700',
  [NotificationType.PROCEDURE_COMPLETED]: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  [NotificationType.PROCEDURE_REJECTED]: 'bg-red-50 border-red-200 text-red-700',
  [NotificationType.PROCEDURE_CANCELLED]: 'bg-red-50 border-red-200 text-red-700',
  [NotificationType.DESTINATION_CREATED]: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  [NotificationType.DESTINATION_UPDATED]: 'bg-sky-50 border-sky-200 text-sky-700',
  [NotificationType.DESTINATION_SOFT_DELETED]: 'bg-red-50 border-red-200 text-red-700',
  [NotificationType.DESTINATION_RESTORED]: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  [NotificationType.DESTINATION_HARD_DELETED]: 'bg-red-50 border-red-200 text-red-700',
  [NotificationType.REVIEW_RECEIVED]: 'bg-amber-50 border-amber-200 text-amber-700',
  [NotificationType.REVIEW_RESPONSE]: 'bg-sky-50 border-sky-200 text-sky-700',
  [NotificationType.CONTACT_NEW]: 'bg-sky-50 border-sky-200 text-sky-700',
  [NotificationType.CONTACT_REPLIED]: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  [NotificationType.ACCOUNT_LOCKED]: 'bg-red-50 border-red-200 text-red-700',
  [NotificationType.ACCOUNT_PROMOTED]: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  [NotificationType.SESSION_REVOKED]: 'bg-amber-50 border-amber-200 text-amber-700',
  [NotificationType.CONSULTANT_ABSENCE_DECLARED]: 'bg-amber-50 border-amber-200 text-amber-700',
  [NotificationType.SYSTEM]: 'bg-slate-50 border-slate-200 text-slate-700',
};

const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  [NotificationType.RENDEZVOUS_CREATED]: 'Rendez-vous cree',
  [NotificationType.RENDEZVOUS_RESCHEDULED]: 'Rendez-vous replanifie',
  [NotificationType.RENDEZVOUS_CANCELLED]: 'Rendez-vous annule',
  [NotificationType.FOLLOWUP_CREATED]: 'Consultation creee',
  [NotificationType.FOLLOWUP_RESCHEDULED]: 'Consultation replanifiee',
  [NotificationType.FOLLOWUP_CANCELLED]: 'Consultation annulee',
  [NotificationType.FOLLOWUP_COMPLETED]: 'Consultation effectuee',
  [NotificationType.PROCEDURE_CREATED]: 'Procedure creee',
  [NotificationType.PROCEDURE_STEP_COMPLETED]: 'Etape validee',
  [NotificationType.PROCEDURE_STEP_REJECTED]: 'Etape rejetee',
  [NotificationType.PROCEDURE_COMPLETED]: 'Procedure terminee',
  [NotificationType.PROCEDURE_REJECTED]: 'Procedure rejetee',
  [NotificationType.PROCEDURE_CANCELLED]: 'Procedure annulee',
  [NotificationType.DESTINATION_CREATED]: 'Destination creee',
  [NotificationType.DESTINATION_UPDATED]: 'Destination mise a jour',
  [NotificationType.DESTINATION_SOFT_DELETED]: 'Destination supprimee',
  [NotificationType.DESTINATION_RESTORED]: 'Destination restauree',
  [NotificationType.DESTINATION_HARD_DELETED]: 'Destination supprimee',
  [NotificationType.REVIEW_RECEIVED]: 'Avis recu',
  [NotificationType.REVIEW_RESPONSE]: 'Reponse a un avis',
  [NotificationType.CONTACT_NEW]: 'Nouveau message',
  [NotificationType.CONTACT_REPLIED]: 'Message repondu',
  [NotificationType.ACCOUNT_LOCKED]: 'Compte verrouille',
  [NotificationType.ACCOUNT_PROMOTED]: 'Compte promu',
  [NotificationType.SESSION_REVOKED]: 'Session revoquee',
  [NotificationType.CONSULTANT_ABSENCE_DECLARED]: 'Absence declaree',
  [NotificationType.SYSTEM]: 'Systeme',
};

export default function ConsultantNotificationsPage() {
  const router = useRouter();

  // ===== REALTIME =====
  useNotificationsRealtime();

  // ===== DATA =====
  const { data: notifications, isLoading, refetch } = useMyNotifications(1, 50);
  const { data: unreadData, refetch: refetchUnread } = useNotificationUnreadCount();

  // ===== STATE =====
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<NotificationFilter>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ===== MUTATIONS =====
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  // ===== HELPERS =====
  const getIcon = (type: NotificationType) => {
    const Icon = NOTIFICATION_ICONS[type] || Bell;
    return Icon;
  };

  const getColor = (type: NotificationType) => {
    return NOTIFICATION_COLORS[type] || 'bg-slate-50 border-slate-200 text-slate-700';
  };

  const getLabel = (type: NotificationType) => {
    return NOTIFICATION_LABELS[type] || type;
  };

  const getEntityLink = (notification: NotificationResponse) => {
    const entity = notification.entity?.toLowerCase();
    const entityId = notification.entityId;

    if (!entityId) return null;

    switch (entity) {
      case 'rendezvous':
      case 'rendez-vous':
        return `/consultant/rendez-vous/${entityId}`;
      case 'procedure':
        return `/consultant/procedure/${entityId}`;
      case 'followup':
      case 'follow-up':
        return `/consultant/consultation/${entityId}`;
      default:
        return null;
    }
  };

  // ===== FILTRAGE =====
  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];

    let result = [...notifications.items];

    if (filter === 'UNREAD') {
      result = result.filter((n) => !n.isRead);
    } else if (filter === 'READ') {
      result = result.filter((n) => n.isRead);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          getLabel(n.type).toLowerCase().includes(q)
      );
    }

    return result;
  }, [notifications, filter, searchTerm]);

  // ===== STATISTIQUES =====
  const stats = useMemo(() => {
    if (!notifications) return { total: 0, unread: 0, read: 0 };

    const total = notifications.items.length;
    const unread = notifications.items.filter((n) => !n.isRead).length;
    const read = total - unread;

    return { total, unread, read };
  }, [notifications]);

  // ===== KPIMETRICS =====
  const kpiMetrics = [
    {
      label: 'Total',
      value: stats.total,
      icon: <Bell className="w-3.5 h-3.5" />,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
    },
    {
      label: 'Non lues',
      value: stats.unread,
      icon: <Bell className="w-3.5 h-3.5" />,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
    },
    {
      label: 'Lues',
      value: stats.read,
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ];

  // ===== FILTER OPTIONS =====
  const filterOptions = [
    { value: 'ALL', label: 'Toutes' },
    { value: 'UNREAD', label: 'Non lues' },
    { value: 'READ', label: 'Lues' },
  ];

  // ===== HANDLERS =====
  const handleMarkAsRead = async (notificationId: string) => {
    await markAsReadMutation.mutateAsync(notificationId);
    refetch();
    refetchUnread();
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync();
    refetch();
    refetchUnread();
  };

  const handleNotificationClick = async (notification: NotificationResponse) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }

    const link = getEntityLink(notification);
    if (link) {
      router.push(link);
    }
  };

  const unreadCount = unreadData?.count || 0;

  // ===== LOADING =====
  if (isLoading) {
    return (
      <section className="w-full bg-white py-12 sm:py-16 lg:py-20 min-h-screen">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <LoadingState message="Chargement de vos notifications..." />
        </div>
      </section>
    );
  }

  // ===== RENDER =====
  return (
    <section className="w-full bg-white py-8 sm:py-12 min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 mb-4">
                <Bell className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-medium tracking-wide text-sky-700">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                Notifications
              </h1>
              <p className="mt-2 text-sm text-slate-500 sm:text-base">
                Consultez et gerez vos notifications en temps reel.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {stats.unread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsReadMutation.isPending}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {markAllAsReadMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Tout marquer comme lu
                </button>
              )}

              <button
                type="button"
                onClick={() => refetch()}
                className="p-2.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-colors shadow-2xs"
                title="Actualiser"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* KPIMetrics */}
        <KPIMetrics metrics={kpiMetrics} className="mb-6" />

        {/* Filters & Search */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Rechercher une notification..."
              className="flex-1"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <FilterBar
              filters={filterOptions}
              activeFilter={filter}
              onFilterChange={(v) => setFilter(v as NotificationFilter)}
              label="Filtrer :"
            />
          </div>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length > 0 ? (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => {
              const Icon = getIcon(notification.type);
              const color = getColor(notification.type);
              const label = getLabel(notification.type);
              const isExpanded = expandedId === notification.id;
              const link = getEntityLink(notification);

              return (
                <div
                  key={notification.id}
                  className={`bg-white border rounded-xl p-4 transition-all ${
                    notification.isRead
                      ? 'border-slate-200 opacity-75'
                      : 'border-sky-200 bg-sky-50/30 shadow-xs'
                  } ${isExpanded ? 'border-sky-300 shadow-sm' : 'hover:border-slate-300'}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-2 rounded-xl border ${color} shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-900">
                              {notification.title}
                            </h3>
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              {label}
                            </span>
                            {!notification.isRead && (
                              <span className="w-2 h-2 rounded-full bg-sky-500" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {notification.message}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-400">
                            {formatRelativeDate(notification.createdAt)}
                          </span>
                          {!notification.isRead && (
                            <button
                              type="button"
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={markAsReadMutation.isPending}
                              className="p-1 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-sky-50 transition-colors"
                              title="Marquer comme lu"
                            >
                              {markAsReadMutation.isPending &&
                              markAsReadMutation.variables === notification.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : notification.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">Type :</span>
                          <span className="ml-2 font-medium text-slate-700">
                            {label}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Cree le :</span>
                          <span className="ml-2 font-medium text-slate-700">
                            {formatDateTime(notification.createdAt)}
                          </span>
                        </div>
                        {notification.readAt && (
                          <div>
                            <span className="text-slate-500">Lu le :</span>
                            <span className="ml-2 font-medium text-slate-700">
                              {formatDateTime(notification.readAt)}
                            </span>
                          </div>
                        )}
                        {notification.entity && (
                          <div>
                            <span className="text-slate-500">Entite :</span>
                            <span className="ml-2 font-medium text-slate-700">
                              {notification.entity}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                        {link ? (
                          <button
                            type="button"
                            onClick={() => handleNotificationClick(notification)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-medium rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Voir le detail
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Aucun detail supplementaire
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Aucune notification"
            description={
              filter === 'UNREAD'
                ? 'Vous n\'avez pas de notifications non lues.'
                : filter === 'READ'
                ? 'Vous n\'avez pas de notifications lues.'
                : 'Vous n\'avez pas encore de notifications.'
            }
            icon={<BellOff className="w-7 h-7" />}
          />
        )}
      </div>
    </section>
  );
}