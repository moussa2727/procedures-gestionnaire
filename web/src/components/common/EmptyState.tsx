'use client';

import React from 'react';
import { FileText } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
        {icon || <FileText className="w-7 h-7" />}
      </div>
      <div>
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">{description}</p>
      </div>
      {action}
    </div>
  );
}