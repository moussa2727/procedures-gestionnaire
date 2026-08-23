'use client';

import React from 'react';

interface PageHeaderProps {
  icon: React.ReactNode;
  badge?: React.ReactNode;
  title: string;
  subtitle: string;
  className?: string;
}

export function PageHeader({ icon, badge, title, subtitle, className = '' }: PageHeaderProps) {
  return (
    <div className={`mb-8 sm:mb-10 ${className}`}>
      <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 mb-4">
        {icon}
        {badge}
        <span className="text-xs font-medium tracking-wide text-sky-700">
          {title}
        </span>
      </div>
      <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 text-sm text-slate-500 sm:text-base">
        {subtitle}
      </p>
    </div>
  );
}
