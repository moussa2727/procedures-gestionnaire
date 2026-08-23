// components/admin/users/AdminUserCard.tsx
'use client';

import React from 'react';
import { AnimatePresence } from 'motion/react';
import type { UserResponse } from '@/src/types/user';

import { AdminUserCardHeader } from './AdminUserCardHeader';
import { AdminUserCardExpanded } from './AdminUserCardExpanded';

interface AdminUserCardProps {
  user: UserResponse;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onPromoteToConsultant?: () => void;
  onDelete: () => void;
  className?: string;
}

export function AdminUserCard({
  user,
  isExpanded = false,
  onToggleExpand,
  onEdit,
  onToggleStatus,
  onPromoteToConsultant,
  onDelete,
  className = '',
}: AdminUserCardProps) {
  return (
    <div
      className={`bg-white border rounded-2xl p-4 sm:p-5 transition-all ${
        isExpanded ? 'border-sky-400 shadow-sm' : 'border-slate-200 hover:border-sky-300 shadow-sm'
      } ${!user.isActive ? 'opacity-70' : ''} ${className}`}
    >
      <AdminUserCardHeader
        user={user}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand!}
        onEdit={onEdit}
        onToggleStatus={onToggleStatus}
        onPromoteToConsultant={onPromoteToConsultant}
        onDelete={onDelete}
      />
      <AnimatePresence>
        {isExpanded && (
          <AdminUserCardExpanded
            user={user}
            onPromoteToConsultant={onPromoteToConsultant}
            onEdit={onEdit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
