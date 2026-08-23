// components/(auth)/AuthSuccess.tsx
'use client';

import { LucideIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface AuthSuccessProps {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: {
    href: string;
    label: string;
  };
  iconClassName?: string;
}

export function AuthSuccess({ 
  icon: Icon, 
  title, 
  message, 
  action,
  iconClassName = 'text-emerald-600',
}: AuthSuccessProps) {
  return (
    <div className="text-center py-2">
      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3.5 border border-emerald-100 shadow-xs">
        <Icon className={`w-6 h-6 ${iconClassName}`} />
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-1.5">{title}</h2>
      <p className="text-xs sm:text-sm text-slate-600 mb-4 max-w-sm mx-auto leading-relaxed">{message}</p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{action.label}</span>
        </Link>
      )}
    </div>
  );
}