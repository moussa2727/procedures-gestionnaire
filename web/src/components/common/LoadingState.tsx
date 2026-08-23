'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Chargement en cours...', className = '' }: LoadingStateProps) {
  return (
    <div className={`p-12 text-center bg-white border border-slate-200 rounded-2xl ${className}`}>
      <RefreshCw className="w-6 h-6 text-sky-600 animate-spin mx-auto mb-2" />
      <p className="text-xs font-medium text-slate-500">{message}</p>
    </div>
  );
}