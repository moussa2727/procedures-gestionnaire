'use client';

import React from 'react';
import { Globe } from 'lucide-react';

interface LoaderProps {
  message?: string;
  subMessage?: string;
}

export function QuizLoader({ message = 'Chargement...', subMessage }: LoaderProps) {
  return (
    <div className="text-center max-w-md">
      <div className="relative w-24 h-24 mx-auto mb-6">
        <div className="absolute inset-0 bg-sky-100 rounded-full opacity-30 blur-xl animate-pulse" />
        <div className="absolute inset-4 border-4 border-sky-200 rounded-full border-t-sky-600 animate-spin" />
        <div className="absolute inset-6 bg-sky-50 rounded-full flex items-center justify-center">
          <Globe className="h-8 w-8 text-sky-600 animate-pulse" />
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-800">{message}</h3>
        {subMessage && <p className="text-slate-500 text-sm">{subMessage}</p>}
        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4">
          <div className="bg-sky-600 h-1.5 rounded-full animate-pulse" style={{ width: '75%' }} />
        </div>
      </div>
    </div>
  );
}
