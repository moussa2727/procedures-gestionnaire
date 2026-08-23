// components/admin/notifications/AdminNotificationDropdown.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  CheckCircle,
  Inbox,
  ChevronDown,
  X,
  RefreshCw,
  Circle,
} from 'lucide-react';
import Link from 'next/link';
import { AdminNotificationCard } from './AdminNotificationCard';
import type { NotificationResponse } from '@/src/types/notification';

interface AdminNotificationDropdownProps {
  notifications: NotificationResponse[];
  unreadCount: number;
  isLoading?: boolean;
  onOpen?: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onRefresh: () => void;
  onNavigate?: (entityId?: string | null, entity?: string | null) => void;
  className?: string;
}

export function AdminNotificationDropdown({
  notifications,
  unreadCount,
  isLoading = false,
  onOpen,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
  onNavigate,
  className = '',
}: AdminNotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState && onOpen) {
      onOpen();
    }
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  // Fermer le dropdown en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const displayedNotifications = notifications.slice(0, 8);
  const hasMore = notifications.length > 8;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Bouton */}
      <button
        type="button"
        onClick={toggleDropdown}
        className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-96 max-h-115 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-medium text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full">
                    {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onMarkAllAsRead();
                      closeDropdown();
                    }}
                    className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                    title="Tout marquer comme lu"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onRefresh();
                    closeDropdown();
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Actualiser"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Liste */}
            <div className="overflow-y-auto max-h-85 p-2 space-y-1">
              {isLoading ? (
                <div className="py-8 text-center">
                  <RefreshCw className="w-5 h-5 text-sky-600 animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 mt-2">Chargement...</p>
                </div>
              ) : displayedNotifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">Aucune notification</p>
                  <p className="text-xs text-slate-400">Vous êtes à jour !</p>
                </div>
              ) : (
                displayedNotifications.map((notification) => (
                  <AdminNotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={(id: string) => {
                      onMarkAsRead(id);
                      // Ne pas fermer le dropdown pour permettre de voir les autres
                    }}
                    onNavigate={(entityId: string | null | undefined, entity: string | null | undefined) => {
                      if (onNavigate) {
                        onNavigate(entityId, entity);
                      }
                      closeDropdown();
                    }}
                    className="border-slate-100! hover:border-slate-200!"
                  />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-2 bg-slate-50/50">
              <Link
                href="/admin/notifications"
                onClick={closeDropdown}
                className="flex items-center justify-center gap-1.5 w-full px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Voir toutes les notifications
                {hasMore && (
                  <span className="text-[10px] font-medium text-slate-400">
                    ({notifications.length - 8} supplémentaires)
                  </span>
                )}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}