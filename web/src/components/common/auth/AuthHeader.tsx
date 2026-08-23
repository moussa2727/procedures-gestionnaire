// components/(auth)/AuthHeader.tsx
'use client';

import { Sparkles } from 'lucide-react';

interface AuthHeaderProps {
  title: string;
  subtitle: string;
  badge?: string;
  className?: string;
}

export function AuthHeader({ title, subtitle, badge, className = '' }: AuthHeaderProps) {
  return (
    <div className={`text-center mb-5 ${className}`}>
      <div className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-700 text-[11px] font-semibold mb-2.5">
        <Sparkles className="w-3 h-3 text-sky-600" />
        <span>{badge || ` ${title}`}</span>
      </div>
      <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">{subtitle}</p>
    </div>
  );
}