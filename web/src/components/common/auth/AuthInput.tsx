// components/(auth)/AuthInput.tsx
'use client';

import React, { forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';
import type { UseFormRegister } from 'react-hook-form';

export interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  error?: string;
  containerClassName?: string;
  register?: UseFormRegister<any>;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, icon: Icon, error, register, containerClassName, className, id, ...props }, ref) => {
    const inputId = id || `auth-input-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const registerProps = register && props.name ? register(props.name) : {};

    return (
      <div className={`space-y-1 ${containerClassName || ''}`}>
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
        <div className="relative">
          {Icon && (
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border rounded-xl text-slate-900 text-xs sm:text-sm transition-all placeholder:text-slate-400 focus:outline-none ${
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
                : 'border-slate-200 hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15'
            } ${className || ''}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
            {...registerProps}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-[11px] font-medium text-rose-500 mt-0.5">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';