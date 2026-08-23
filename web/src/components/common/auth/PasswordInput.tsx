// components/(auth)/PasswordInput.tsx
'use client';

import { useState, forwardRef } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { AuthInput, AuthInputProps } from './AuthInput';

export const PasswordInput = forwardRef<HTMLInputElement, Omit<AuthInputProps, 'icon' | 'type'>>(
  ({ label = 'Mot de passe', placeholder = '••••••••', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="relative">
        <AuthInput
          ref={ref}
          label={label}
          icon={Lock}
          type={showPassword ? 'text' : 'password'}
          placeholder={placeholder}
          className="pr-10"
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-7.5 p-1 text-slate-400 hover:text-slate-600 transition-colors rounded-lg focus:outline-none"
          aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';