// components/admin/dashboard/AdminQuickActions.tsx
'use client';

import React from 'react';
import {
  CalendarPlus,
  FilePlus,
  UserPlus,
  Building2,
  MailPlus,
  Clock,
  Users,
  Settings,
  Plus,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  color: 'sky' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';
}

interface AdminQuickActionsProps {
  actions?: QuickAction[];
  onActionClick?: (actionId: string) => void;
  className?: string;
}

const defaultActions: QuickAction[] = [
  {
    id: 'new-rendezvous',
    label: 'Nouveau rendez-vous',
    description: 'Planifier un entretien',
    icon: <CalendarPlus className="w-4 h-4" />,
    href: '/admin/rendez-vous/new',
    color: 'sky',
  },
  {
    id: 'new-user',
    label: 'Nouvel utilisateur',
    description: 'Créer un compte',
    icon: <UserPlus className="w-4 h-4" />,
    href: '/admin/users/new',
    color: 'indigo',
  },
  {
    id: 'new-destination',
    label: 'Nouvelle destination',
    description: 'Ajouter un pays',
    icon: <Building2 className="w-4 h-4" />,
    href: '/admin/destinations/new',
    color: 'amber',
  },
  {
    id: 'view-contacts',
    label: 'Messages',
    description: 'Consulter les messages',
    icon: <MailPlus className="w-4 h-4" />,
    href: '/admin/contacts',
    color: 'rose',
  },
  {
    id: 'view-schedule',
    label: 'Agenda',
    description: 'Voir le planning',
    icon: <Clock className="w-4 h-4" />,
    href: '/admin/agenda',
    color: 'slate',
  },
];

const colorClasses = {
  sky: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    hover: 'hover:border-sky-300 hover:bg-sky-100',
    icon: 'text-sky-600',
    text: 'text-sky-700',
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    hover: 'hover:border-emerald-300 hover:bg-emerald-100',
    icon: 'text-emerald-600',
    text: 'text-emerald-700',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    hover: 'hover:border-amber-300 hover:bg-amber-100',
    icon: 'text-amber-600',
    text: 'text-amber-700',
  },
  rose: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    hover: 'hover:border-rose-300 hover:bg-rose-100',
    icon: 'text-rose-600',
    text: 'text-rose-700',
  },
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    hover: 'hover:border-indigo-300 hover:bg-indigo-100',
    icon: 'text-indigo-600',
    text: 'text-indigo-700',
  },
  slate: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    hover: 'hover:border-slate-300 hover:bg-slate-100',
    icon: 'text-slate-600',
    text: 'text-slate-700',
  },
};

export function AdminQuickActions({
  actions = defaultActions,
  onActionClick,
  className = '',
}: AdminQuickActionsProps) {
  const handleClick = (action: QuickAction) => {
    if (action.onClick) {
      action.onClick();
    }
    if (onActionClick) {
      onActionClick(action.id);
    }
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Plus className="w-4 h-4 text-slate-400" />
          Actions rapides
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {actions.map((action) => {
          const colors = colorClasses[action.color];

          const content = (
            <div
              className={`flex flex-col items-center text-center p-3.5 rounded-xl border transition-all ${colors.bg} ${colors.border} ${colors.hover} cursor-pointer`}
              onClick={() => handleClick(action)}
            >
              <div className={`p-2 rounded-lg bg-white border ${colors.border} mb-2`}>
                <span className={colors.icon}>{action.icon}</span>
              </div>
              <span className={`text-xs font-semibold ${colors.text}`}>
                {action.label}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {action.description}
              </span>
            </div>
          );

          if (action.href) {
            return (
              <Link key={action.id} href={action.href}>
                {content}
              </Link>
            );
          }

          return (
            <div key={action.id} role="button" tabIndex={0}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}