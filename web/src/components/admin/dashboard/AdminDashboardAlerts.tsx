// components/admin/dashboard/AdminDashboardAlerts.tsx
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Bell,
  Calendar,
  Clock,
  Mail,
  Users,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

export interface DashboardAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  link?: {
    href: string;
    label: string;
  };
  dismissible?: boolean;
  icon?: React.ReactNode;
}

interface AdminDashboardAlertsProps {
  alerts: DashboardAlert[];
  onDismiss?: (id: string) => void;
  className?: string;
}

const alertConfigs = {
  info: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    iconBg: 'bg-sky-100',
    icon: Info,
    iconColor: 'text-sky-600',
    textColor: 'text-sky-800',
    buttonColor: 'hover:bg-sky-100 text-sky-500',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    textColor: 'text-amber-800',
    buttonColor: 'hover:bg-amber-100 text-amber-500',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconBg: 'bg-red-100',
    icon: AlertCircle,
    iconColor: 'text-red-600',
    textColor: 'text-red-800',
    buttonColor: 'hover:bg-red-100 text-red-500',
  },
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    icon: CheckCircle,
    iconColor: 'text-emerald-600',
    textColor: 'text-emerald-800',
    buttonColor: 'hover:bg-emerald-100 text-emerald-500',
  },
};

// Alertes prédéfinies pour le dashboard
export function getDefaultAlerts(stats: {
  contactsUnread?: number;
  rendezvousToday?: number;
  rendezvousPending?: number;
  proceduresInProgress?: number;
  newUsersThisWeek?: number;
}): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  if (stats.contactsUnread && stats.contactsUnread > 0) {
    alerts.push({
      id: 'unread-contacts',
      type: 'warning',
      title: `${stats.contactsUnread} message${stats.contactsUnread > 1 ? 's' : ''} non lu${stats.contactsUnread > 1 ? 's' : ''}`,
      message: 'Des messages de contact attendent votre réponse.',
      link: { href: '/admin/contacts', label: 'Consulter' },
      dismissible: true,
      icon: <Mail className="w-4 h-4" />,
    });
  }

  if (stats.rendezvousToday && stats.rendezvousToday > 0) {
    alerts.push({
      id: 'rendezvous-today',
      type: 'info',
      title: `${stats.rendezvousToday} rendez-vous aujourd'hui`,
      message: 'Consultez votre agenda pour la journée.',
      link: { href: '/admin/agenda', label: 'Voir l\'agenda' },
      dismissible: true,
      icon: <Calendar className="w-4 h-4" />,
    });
  }

  if (stats.rendezvousPending && stats.rendezvousPending > 0) {
    alerts.push({
      id: 'rendezvous-pending',
      type: 'warning',
      title: `${stats.rendezvousPending} rendez-vous en attente`,
      message: 'Ces rendez-vous doivent être confirmés ou traités.',
      link: { href: '/admin/rendez-vous?status=PENDING', label: 'Voir' },
      dismissible: true,
      icon: <Clock className="w-4 h-4" />,
    });
  }

  if (stats.proceduresInProgress && stats.proceduresInProgress > 0) {
    alerts.push({
      id: 'procedures-in-progress',
      type: 'info',
      title: `${stats.proceduresInProgress} procédure${stats.proceduresInProgress > 1 ? 's' : ''} en cours`,
      message: 'Suivez l\'avancement des dossiers.',
      link: { href: '/admin/procedures', label: 'Voir les procédures' },
      dismissible: true,
      icon: <FileText className="w-4 h-4" />,
    });
  }

  if (stats.newUsersThisWeek && stats.newUsersThisWeek > 0) {
    alerts.push({
      id: 'new-users',
      type: 'success',
      title: `${stats.newUsersThisWeek} nouvel${stats.newUsersThisWeek > 1 ? 's' : ''} utilisateur${stats.newUsersThisWeek > 1 ? 's' : ''} cette semaine`,
      message: 'De nouveaux comptes ont été créés.',
      link: { href: '/admin/users', label: 'Voir' },
      dismissible: true,
      icon: <Users className="w-4 h-4" />,
    });
  }

  return alerts;
}

export function AdminDashboardAlerts({
  alerts,
  onDismiss,
  className = '',
}: AdminDashboardAlertsProps) {
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    if (onDismiss) {
      onDismiss(id);
    }
  };

  const visibleAlerts = alerts.filter((alert) => !dismissedIds.has(alert.id));

  if (visibleAlerts.length === 0) {
    return (
      <div className={`bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm ${className}`}>
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Bell className="w-4 h-4" />
          <span className="text-sm font-medium">Aucune alerte</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">Tout est à jour !</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      <AnimatePresence>
        {visibleAlerts.map((alert) => {
            const config = alertConfigs[alert.type];
            let Icon = config.icon;
            let iconProps = { className: `w-4 h-4 ${config.iconColor}` };

            if (alert.icon) {
            // Si alert.icon est un ReactNode déjà instancié, on le rend directement
            // Sinon, on utilise le composant config.icon
            Icon = config.icon;
            // On rend l'icône personnalisée dans le JSX avec un conditionnel
            }

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-start gap-3 p-3.5 rounded-xl border ${config.bg} ${config.border}`}
            >
              <div className={`p-1.5 rounded-lg ${config.iconBg}`}>
                {alert.icon ? (
                <span className={`w-4 h-4 ${config.iconColor}`}>{alert.icon}</span>
                ) : (
                <Icon className={`w-4 h-4 ${config.iconColor}`} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-xs font-bold ${config.textColor}`}>
                      {alert.title}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {alert.message}
                    </p>
                  </div>
                  {alert.dismissible !== false && (
                    <button
                      type="button"
                      onClick={() => handleDismiss(alert.id)}
                      className={`p-1 rounded-lg transition-colors ${config.buttonColor}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {alert.link && (
                  <Link
                    href={alert.link.href}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline mt-1"
                  >
                    {alert.link.label}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}