// components/admin/common/AdminNavigation.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  CalendarDays,
  Clock,
  Building2,
  Users,
  UserX,
  Star,
  Mail,
  Bell,
  Shield,
  User,
  Monitor,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: '/admin/statistiques', label: 'Tableau de bord', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { href: '/admin/rendez-vous', label: 'Rendez-vous', icon: <Calendar className="w-3.5 h-3.5" /> },
  { href: '/admin/procedures', label: 'Procédures', icon: <FileText className="w-3.5 h-3.5" /> },
  { href: '/admin/follow-up', label: 'Suivi', icon: <CalendarDays className="w-3.5 h-3.5" /> },
  { href: '/admin/agenda', label: 'Agenda', icon: <Clock className="w-3.5 h-3.5" /> },
  { href: '/admin/destinations', label: 'Destinations', icon: <Building2 className="w-3.5 h-3.5" /> },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: <Users className="w-3.5 h-3.5" /> },
  { href: '/admin/absences', label: 'Absences', icon: <UserX className="w-3.5 h-3.5" /> },
  { href: '/admin/avis', label: 'Avis', icon: <Star className="w-3.5 h-3.5" /> },
  { href: '/admin/contacts', label: 'Messages', icon: <Mail className="w-3.5 h-3.5" /> },
  { href: '/admin/notifications', label: 'Notifications', icon: <Bell className="w-3.5 h-3.5" /> },
  { href: '/admin/securite', label: 'Sécurité', icon: <Shield className="w-3.5 h-3.5" /> },
  { href: '/admin/mon-profil', label: 'Mon profil', icon: <User className="w-3.5 h-3.5" /> },
  { href: '/admin/mes-sessions', label: 'Mes sessions', icon: <Monitor className="w-3.5 h-3.5" /> },
];

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation d'administration"
      className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 py-2.5 sm:px-6 sticky top-0 z-30 shadow-xs"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin/statistiques' && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200/90 text-slate-600 hover:border-sky-300 hover:text-sky-700 hover:bg-slate-50/80'
              }`}
            >
              <span className={isActive ? 'text-sky-400' : 'text-slate-400'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
