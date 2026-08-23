'use client';

import React from 'react';
import { X, Users, UserCheck } from 'lucide-react';
import { SearchInput, FilterBar } from '@/src/components/common';
import type { UserResponse } from '@/src/types/user';

interface AdminFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  consultantFilter: string;
  onConsultantFilterChange: (value: string) => void;
  studentFilter: string;
  onStudentFilterChange: (value: string) => void;
  consultants: UserResponse[];
  students: UserResponse[];
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  statusOptions: { value: string; label: string; count: number }[];
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function AdminFilterBar({
  searchTerm,
  onSearchChange,
  consultantFilter,
  onConsultantFilterChange,
  studentFilter,
  onStudentFilterChange,
  consultants,
  students,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  hasActiveFilters,
  onResetFilters,
  children,
  className = '',
}: AdminFilterBarProps) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <SearchInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Rechercher..."
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* Consultant Filter */}
          <div className="relative">
            <UserCheck className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={consultantFilter}
              onChange={(e) => onConsultantFilterChange(e.target.value)}
              className="pl-8 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-sky-600 cursor-pointer appearance-none"
            >
              <option value="all">Tous les consultants</option>
              {consultants.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Student Filter */}
          <div className="relative">
            <Users className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={studentFilter}
              onChange={(e) => onStudentFilterChange(e.target.value)}
              className="pl-8 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-sky-600 cursor-pointer appearance-none"
            >
              <option value="all">Tous les étudiants</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </div>

          {children}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5 inline mr-1" />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <FilterBar
        label="Statut :"
        filters={statusOptions}
        activeFilter={statusFilter}
        onFilterChange={onStatusFilterChange}
      />
    </div>
  );
}