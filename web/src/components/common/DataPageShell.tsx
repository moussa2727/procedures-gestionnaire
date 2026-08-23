'use client';

import React from 'react';
import { PageHeader } from './PageHeader';
import { KPIMetrics } from './KPIMetrics';
import { SearchInput } from './SearchInput';
import { FilterBar } from './FilterBar';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';
import type { FilterOption } from './FilterBar';

interface DataPageShellProps {
  isLoading?: boolean;
  loadingMessage?: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  kpiMetrics?: {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
  }[];
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filterOptions?: FilterOption[];
  activeFilter?: string;
  onFilterChange?: (value: string) => void;
  filterLabel?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
  spacing?: 'sm' | 'md' | 'lg';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
};

const spacingClasses = {
  sm: 'py-8 sm:py-12',
  md: 'py-12 sm:py-16 lg:py-20',
  lg: 'py-16 sm:py-24 lg:py-32',
};

export function DataPageShell({
  isLoading,
  loadingMessage = 'Chargement...',
  icon,
  title,
  subtitle,
  kpiMetrics = [],
  searchTerm,
  onSearchChange,
  searchPlaceholder,
  filterOptions,
  activeFilter,
  onFilterChange,
  filterLabel,
  onRefresh,
  isRefreshing,
  isEmpty,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  children,
  className = '',
  maxWidth = '5xl',
  spacing = 'md',
}: DataPageShellProps) {
  if (isLoading) {
    return (
      <section className={`w-full bg-white ${spacingClasses[spacing]} min-h-screen ${className}`}>
        <div className={`mx-auto ${maxWidthClasses[maxWidth]} px-4 sm:px-6 lg:px-8`}>
          <LoadingState message={loadingMessage} />
        </div>
      </section>
    );
  }

  return (
    <section className={`w-full bg-white ${spacingClasses[spacing]} min-h-screen ${className}`}>
      <div className={`mx-auto ${maxWidthClasses[maxWidth]} px-4 sm:px-6 lg:px-8`}>
        <PageHeader icon={icon} title={title} subtitle={subtitle} />

        {kpiMetrics.length > 0 && <KPIMetrics metrics={kpiMetrics} className="mb-6" />}

        {(searchTerm !== undefined || filterOptions) && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {searchTerm !== undefined && onSearchChange && (
                <SearchInput
                  value={searchTerm}
                  onChange={onSearchChange}
                  placeholder={searchPlaceholder}
                  className="flex-1"
                />
              )}
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="p-2.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-colors shadow-2xs shrink-0"
                  title="Actualiser"
                >
                  <svg
                    className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            </div>

            {filterOptions && activeFilter !== undefined && onFilterChange && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <FilterBar
                  filters={filterOptions}
                  activeFilter={activeFilter}
                  onFilterChange={onFilterChange}
                  label={filterLabel}
                />
              </div>
            )}
          </div>
        )}

        {isEmpty ? (
          <EmptyState
            title={emptyTitle || 'Aucun element'}
            description={emptyDescription || 'Aucun element ne correspond a vos criteres.'}
            icon={emptyIcon}
            action={emptyAction}
          />
        ) : (
          <div className="space-y-4">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
