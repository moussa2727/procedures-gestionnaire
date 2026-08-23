// components/admin/destinations/AdminDestinationCard.tsx
'use client';

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { StatusBadge } from '@/src/components/common';
import type { DestinationResponse } from '@/src/types/destination';

import { AdminDestinationCardHeader } from './AdminDestinationCardHeader';
import { AdminDestinationCardSummary } from './AdminDestinationCardSummary';
import { AdminDestinationCardExpanded } from './AdminDestinationCardExpanded';
import { AdminDestinationCardActions } from './AdminDestinationCardActions';

interface AdminDestinationCardProps {
  destination: DestinationResponse;
  consultantCount?: number;
  consultantNames?: string[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onViewDetails?: () => void;
  className?: string;
}

export function AdminDestinationCard({
  destination,
  consultantCount = 0,
  consultantNames = [],
  isExpanded = false,
  onToggleExpand,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onViewDetails,
  className = '',
}: AdminDestinationCardProps) {
  return (
    <div
      className={`bg-white border rounded-2xl p-4 sm:p-5 transition-all ${
        isExpanded ? 'border-sky-400 shadow-sm' : 'border-slate-200 hover:border-sky-300 shadow-sm'
      } ${className}`}
    >
      <AdminDestinationCardHeader
        destination={destination}
        consultantCount={consultantCount}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand!}
      />
      <AdminDestinationCardSummary
        destination={destination}
        consultantCount={consultantCount}
      />
      <AnimatePresence>
        {isExpanded && (
          <>
            <AdminDestinationCardExpanded
              destination={destination}
              consultantCount={consultantCount}
              consultantNames={consultantNames}
            />
            <AdminDestinationCardActions
              isArchived={destination.isDeleted}
              onViewDetails={onViewDetails}
              onEdit={onEdit}
              onArchive={onArchive}
              onRestore={onRestore}
              onDelete={onDelete}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
