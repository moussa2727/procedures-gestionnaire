// components/(auth)/AuthFooter.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface AuthFooterProps {
  backLink?: {
    href: string;
    label: string;
  };
  className?: string;
}

export function AuthFooter({ backLink, className = '' }: AuthFooterProps) {
  if (!backLink) return null;

  return (
    <div className={`mt-4 text-center ${className}`}>
      <Link
        href={backLink.href}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{backLink.label}</span>
      </Link>
    </div>
  );
}