// components/admin/dashboard/AdminRecentActivity.tsx
'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  User,
  Mail,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Users,
  Building2,
  Reply,
  CalendarDays,
} from 'lucide-react';
import Link from 'next/link';

export interface ActivityItem {
  id: string;
  type: 'rendezvous' | 'procedure' | 'user' | 'contact' | 'destination' | 'followup';
  action: 'created' | 'updated' | 'completed' | 'cancelled' | 'replied' | 'registered' | 'assigned';
  title: string;
  description: string;
  timestamp: string;
  link?: string;
  metadata?: Record<string, string>;
}

interface AdminRecentActivityProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  maxItems?: number;
  onViewAll?: () => void;
  className?: string;
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

function getActivityIcon(type: ActivityItem['type'], action: ActivityItem['action']) {
  const icons: Record<string, React.ReactNode> = {
    'rendezvous-created': <Calendar className="w-4 h-4 text-sky-600" />,
    'rendezvous-updated': <Calendar className="w-4 h-4 text-amber-600" />,
    'rendezvous-completed': <CheckCircle className="w-4 h-4 text-emerald-600" />,
    'rendezvous-cancelled': <XCircle className="w-4 h-4 text-red-600" />,
    'procedure-created': <FileText className="w-4 h-4 text-sky-600" />,
    'procedure-completed': <CheckCircle className="w-4 h-4 text-emerald-600" />,
    'procedure-cancelled': <XCircle className="w-4 h-4 text-red-600" />,
    'user-registered': <User className="w-4 h-4 text-sky-600" />,
    'contact-created': <Mail className="w-4 h-4 text-amber-600" />,
    'contact-replied': <Reply className="w-4 h-4 text-emerald-600" />,
    'destination-created': <Building2 className="w-4 h-4 text-emerald-600" />,
    'destination-assigned': <Users className="w-4 h-4 text-sky-600" />,
    'followup-created': <CalendarDays className="w-4 h-4 text-sky-600" />,
    'followup-completed': <CheckCircle className="w-4 h-4 text-emerald-600" />,
  };

  const key = `${type}-${action}`;
  return icons[key] || <Clock className="w-4 h-4 text-slate-400" />;
}

function getActivityColor(type: ActivityItem['type'], action: ActivityItem['action']): string {
  if (action === 'cancelled') return 'border-red-200 bg-red-50/50';
  if (action === 'completed' || action === 'replied') return 'border-emerald-200 bg-emerald-50/50';
  if (action === 'registered' || action === 'created') return 'border-sky-200 bg-sky-50/50';
  if (action === 'assigned') return 'border-indigo-200 bg-indigo-50/50';
  return 'border-slate-200 bg-slate-50/50';
}

export function AdminRecentActivity({
  activities,
  isLoading = false,
  maxItems = 10,
  onViewAll,
  className = '',
}: AdminRecentActivityProps) {
  const displayedActivities = activities.slice(0, maxItems);

  if (isLoading) {
    return (
      <div className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900">Activité récente</h3>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-slate-200" />
              <div className="flex-1">
                <div className="h-4 w-3/4 bg-slate-200 rounded mb-1" />
                <div className="h-3 w-1/2 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm ${className}`}>
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <Clock className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-600">Aucune activité récente</p>
        <p className="text-xs text-slate-400 mt-1">Les dernières actions apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          Activité récente
        </h3>
        {onViewAll && activities.length > maxItems && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1"
          >
            Voir tout
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {displayedActivities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-start gap-3 p-3 rounded-xl border ${getActivityColor(
              activity.type,
              activity.action
            )} transition-colors hover:shadow-sm`}
          >
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
              {getActivityIcon(activity.type, activity.action)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-slate-800 truncate">
                  {activity.title}
                </p>
                <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                  {formatRelativeTime(activity.timestamp)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {activity.description}
              </p>
              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {Object.entries(activity.metadata).map(([key, value]) => (
                    <span
                      key={key}
                      className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-medium text-slate-500"
                    >
                      {key}: {value}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {activity.link && (
              <Link
                href={activity.link}
                className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors shrink-0"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}