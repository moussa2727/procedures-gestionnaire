// app/(auth)/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { AuthButton } from '@/src/components/common/auth/AuthButton';
import { AuthCard } from '@/src/components/common/auth/AuthCard';
import { AuthHeader } from '@/src/components/common/auth/AuthHeader';
import { AuthInput } from '@/src/components/common/auth/AuthInput';
import { PasswordInput } from '@/src/components/common/auth/PasswordInput';
import { useLogin } from '@/src/hooks/use-auth';
import { Mail } from 'lucide-react';
import { loginSchema } from '@/src/schemas/auth.schema';
import { SocialAuth } from '@/src/components/common/auth/SocialAuth';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const loginMutation = useLogin();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse(formData);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      parsed.error.issues.forEach((iss) => {
        const key = iss.path[0] as string;
        map[key] = iss.message;
      });
      setErrors(map);
      return;
    }

    loginMutation.mutate(parsed.data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50/80">
      <AuthCard maxWidth="sm">
        <AuthHeader 
          title="Connexion" 
          subtitle="Accédez à votre espace sécurisé" 
        />

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <AuthInput
            label="Adresse e-mail"
            icon={Mail}
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            error={errors.email}
            autoComplete="email"
            placeholder="exemple@email.fr"
          />

          <PasswordInput
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            error={errors.password}
            autoComplete="current-password"
            label="Mot de passe"
          />

          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                className="w-3.5 h-3.5 text-sky-600 border-slate-300 rounded focus:ring-0 focus:border-sky-500 transition-colors"
              />
              <span className="text-xs text-slate-600">Se souvenir de moi</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition-colors"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <AuthButton
            type="submit"
            isLoading={loginMutation.isPending}
            loadingText="Connexion..."
            className="mt-2"
          >
            Se connecter
          </AuthButton>
        </form>

        <SocialAuth />

        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            Pas encore de compte ?{' '}
            <Link
              href="/register"
              className="font-semibold text-sky-600 hover:text-sky-700 transition-colors"
            >
              Créer un compte
            </Link>
          </p>
        </div>
      </AuthCard>
    </div>
  );
}