// components/admin/notifications/AdminNotificationCard.tsx
'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  Bell,
  Calendar,
  FileText,
  Users,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  CalendarDays,
  Reply,
  UserCheck,
  AlertCircle,
  Check,
  Circle,
  User,
} from 'lucide-react';
import { NotificationType } from '@/src/types/enums';
import type { NotificationResponse } from '@/src/types/notification';

interface AdminNotificationCardProps {
  notification: NotificationResponse;
  onMarkAsRead: (id: string) => void;
  onNavigate?: (entityId?: string | null, entity?: string | null) => void;
  className?: string;
}

function getNotificationIcon(type: NotificationType) {
  const iconMap: Record<NotificationType, React.ReactNode> = {
    [NotificationType.RENDEZVOUS_CREATED]: <Calendar className="w-4 h-4 text-sky-600" />,
    [NotificationType.RENDEZVOUS_RESCHEDULED]: <Calendar className="w-4 h-4 text-amber-600" />,
    [NotificationType.RENDEZVOUS_CANCELLED]: <XCircle className="w-4 h-4 text-red-600" />,
    [NotificationType.FOLLOWUP_CREATED]: <CalendarDays className="w-4 h-4 text-sky-600" />,
    [NotificationType.FOLLOWUP_RESCHEDULED]: <CalendarDays className="w-4 h-4 text-amber-600" />,
    [NotificationType.FOLLOWUP_CANCELLED]: <XCircle className="w-4 h-4 text-red-600" />,
    [NotificationType.FOLLOWUP_COMPLETED]: <CheckCircle className="w-4 h-4 text-emerald-600" />,
    [NotificationType.PROCEDURE_CREATED]: <FileText className="w-4 h-4 text-sky-600" />,
    [NotificationType.PROCEDURE_STEP_COMPLETED]: <CheckCircle className="w-4 h-4 text-emerald-600" />,
    [NotificationType.PROCEDURE_STEP_REJECTED]: <XCircle className="w-4 h-4 text-red-600" />,
    [NotificationType.PROCEDURE_COMPLETED]: <CheckCircle className="w-4 h-4 text-emerald-600" />,
    [NotificationType.PROCEDURE_REJECTED]: <XCircle className="w-4 h-4 text-red-600" />,
    [NotificationType.PROCEDURE_CANCELLED]: <XCircle className="w-4 h-4 text-slate-600" />,
    [NotificationType.DESTINATION_CREATED]: <Building2 className="w-4 h-4 text-emerald-600" />,
    [NotificationType.DESTINATION_UPDATED]: <Building2 className="w-4 h-4 text-sky-600" />,
    [NotificationType.DESTINATION_SOFT_DELETED]: <Building2 className="w-4 h-4 text-slate-600" />,
    [NotificationType.DESTINATION_RESTORED]: <Building2 className="w-4 h-4 text-emerald-600" />,
    [NotificationType.DESTINATION_HARD_DELETED]: <Building2 className="w-4 h-4 text-red-600" />,
    [NotificationType.REVIEW_RECEIVED]: <Users className="w-4 h-4 text-amber-600" />,
    [NotificationType.REVIEW_RESPONSE]: <Reply className="w-4 h-4 text-emerald-600" />,
    [NotificationType.CONTACT_NEW]: <Mail className="w-4 h-4 text-amber-600" />,
    [NotificationType.CONTACT_REPLIED]: <Reply className="w-4 h-4 text-emerald-600" />,
    [NotificationType.ACCOUNT_LOCKED]: <AlertCircle className="w-4 h-4 text-red-600" />,
    [NotificationType.ACCOUNT_PROMOTED]: <UserCheck className="w-4 h-4 text-sky-600" />,
    [NotificationType.SESSION_REVOKED]: <Clock className="w-4 h-4 text-slate-600" />,
    [NotificationType.CONSULTANT_ABSENCE_DECLARED]: <User className="w-4 h-4 text-amber-600" />,
    [NotificationType.SYSTEM]: <Bell className="w-4 h-4 text-slate-600" />,
  };
  return iconMap[type] || <Bell className="w-4 h-4 text-slate-400" />;
}

function getNotificationColor(type: NotificationType): string {
  if (type.includes('CANCELLED') || type.includes('REJECTED') || type.includes('DELETED') || type.includes('LOCKED')) {
    return 'border-red-200 bg-red-50/50';
  }
  if (type.includes('COMPLETED') || type.includes('RESPONSE') || type.includes('RESTORED') || type.includes('CREATED')) {
    return 'border-emerald-200 bg-emerald-50/50';
  }
  if (type.includes('RESCHEDULED') || type.includes('PENDING') || type.includes('NEW')) {
    return 'border-amber-200 bg-amber-50/50';
  }
  if (type.includes('UPDATED') || type.includes('PROMOTED')) {
    return 'border-sky-200 bg-sky-50/50';
  }
  return 'border-slate-200 bg-slate-50/50';
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function getTypeLabel(type: NotificationType): string {
  const labels: Partial<Record<NotificationType, string>> = {
    [NotificationType.RENDEZVOUS_CREATED]: 'Rendez-vous créé',
    [NotificationType.RENDEZVOUS_RESCHEDULED]: 'Rendez-vous replanifié',
    [NotificationType.RENDEZVOUS_CANCELLED]: 'Rendez-vous annulé',
    [NotificationType.FOLLOWUP_CREATED]: 'Suivi créé',
    [NotificationType.FOLLOWUP_RESCHEDULED]: 'Suivi replanifié',
    [NotificationType.FOLLOWUP_CANCELLED]: 'Suivi annulé',
    [NotificationType.FOLLOWUP_COMPLETED]: 'Suivi effectué',
    [NotificationType.PROCEDURE_CREATED]: 'Procédure créée',
    [NotificationType.PROCEDURE_STEP_COMPLETED]: 'Étape validée',
    [NotificationType.PROCEDURE_STEP_REJECTED]: 'Étape rejetée',
    [NotificationType.PROCEDURE_COMPLETED]: 'Procédure terminée',
    [NotificationType.PROCEDURE_REJECTED]: 'Procédure rejetée',
    [NotificationType.PROCEDURE_CANCELLED]: 'Procédure annulée',
    [NotificationType.DESTINATION_CREATED]: 'Destination créée',
    [NotificationType.DESTINATION_UPDATED]: 'Destination mise à jour',
    [NotificationType.DESTINATION_SOFT_DELETED]: 'Destination archivée',
    [NotificationType.DESTINATION_RESTORED]: 'Destination restaurée',
    [NotificationType.DESTINATION_HARD_DELETED]: 'Destination supprimée',
    [NotificationType.REVIEW_RECEIVED]: 'Avis reçu',
    [NotificationType.REVIEW_RESPONSE]: 'Réponse à un avis',
    [NotificationType.CONTACT_NEW]: 'Nouveau message',
    [NotificationType.CONTACT_REPLIED]: 'Réponse envoyée',
    [NotificationType.ACCOUNT_LOCKED]: 'Compte verrouillé',
    [NotificationType.ACCOUNT_PROMOTED]: 'Promotion au rôle consultant',
    [NotificationType.SESSION_REVOKED]: 'Session révoquée',
    [NotificationType.SYSTEM]: 'Notification système',
  };
  return labels[type] || type;
}

export function AdminNotificationCard({
  notification,
  onMarkAsRead,
  onNavigate,
  className = '',
}: AdminNotificationCardProps) {
  const isRead = notification.isRead;
  const icon = getNotificationIcon(notification.type);
  const colorClass = getNotificationColor(notification.type);
  const typeLabel = getTypeLabel(notification.type);
  const timeLabel = formatRelativeTime(notification.createdAt);

  const handleClick = () => {
    if (!isRead) {
      onMarkAsRead(notification.id);
    }
    if (onNavigate && notification.entityId) {
      onNavigate(notification.entityId, notification.entity);
    }
  };

  return (
    <div
      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${
        isRead ? 'bg-white border-slate-200' : `${colorClass} border`
      } ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      {/* Icône */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
        isRead ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'
      }`}>
        {icon}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <p className={`text-xs font-semibold truncate ${isRead ? 'text-slate-600' : 'text-slate-900'}`}>
              {notification.title}
            </p>
            {!isRead && (
              <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
            )}
          </div>
          <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
            {timeLabel}
          </span>
        </div>

        <p className={`text-[11px] mt-0.5 line-clamp-2 ${isRead ? 'text-slate-500' : 'text-slate-700'}`}>
          {notification.message}
        </p>

        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            {typeLabel}
          </span>
          {notification.entity && (
            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              {notification.entity}
            </span>
          )}
          {!isRead && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              className="ml-auto text-[10px] font-semibold text-sky-600 hover:text-sky-700 hover:underline"
            >
              Marquer comme lu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}