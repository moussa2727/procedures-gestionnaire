// components/(auth)/AuthButton.tsx
'use client';

import React from 'react';
import { LoaderCircle } from 'lucide-react';

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function AuthButton({
  isLoading = false,
  loadingText = 'Chargement...',
  variant = 'primary',
  fullWidth = true,
  children,
  className = '',
  disabled,
  ...props
}: AuthButtonProps) {
  const variants = {
    primary:
      'bg-sky-600 hover:bg-sky-700 text-white shadow-sm hover:shadow-md hover:shadow-sky-600/20 active:scale-[0.99] disabled:bg-sky-400 disabled:shadow-none',
    secondary:
      'bg-slate-800 hover:bg-slate-900 text-white shadow-sm hover:shadow-md hover:shadow-slate-800/20 active:scale-[0.99] disabled:bg-slate-400 disabled:shadow-none',
    outline:
      'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs active:scale-[0.99] disabled:opacity-50 disabled:shadow-none',
  };

  return (
    <button
      className={`${fullWidth ? 'w-full' : ''} ${variants[variant]} font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all flex justify-center items-center gap-2 cursor-pointer disabled:cursor-not-allowed ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <LoaderCircle className="w-4 h-4 animate-spin" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}