// app/(auth)/reset-password/page.tsx
'use client';

import { useState, FormEvent, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, LoaderCircle } from 'lucide-react';
import { useResetPassword } from '@/src/hooks/use-auth';
import { resetPasswordSchema } from '@/src/schemas/auth.schema';
import { AuthButton } from '@/src/components/common/auth/AuthButton';
import { AuthCard } from '@/src/components/common/auth/AuthCard';
import { AuthFooter } from '@/src/components/common/auth/AuthFooter';
import { AuthHeader } from '@/src/components/common/auth/AuthHeader';
import { AuthSuccess } from '@/src/components/common/auth/AuthSuccess';
import { PasswordInput } from '@/src/components/common/auth/PasswordInput';
import { PasswordStrength } from '@/src/components/common/auth/PasswordStrength';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const resetPasswordMutation = useResetPassword();

  useEffect(() => {
    if (!token) {
      router.push('/login');
    }
  }, [token, router]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (newPassword.length < 8) {
      newErrors.newPassword = 'Le mot de passe doit contenir au moins 8 caractères.';
      isValid = false;
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas.';
      isValid = false;
    }

    try {
      resetPasswordSchema.parse({
        token: token || '',
        newPassword,
      });
    } catch (error: any) {
      if (error?.issues) {
        error.issues.forEach((e: { path: string[]; message: string }) => {
          newErrors[e.path[0]] = e.message;
        });
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!validateForm()) return;

    resetPasswordMutation.mutate(
      { token, newPassword },
      {
        onSuccess: () => {
          setSubmitted(true);
        },
      }
    );
  };

  if (submitted) {
    return (
      <AuthCard maxWidth="sm">
        <AuthSuccess
          icon={Lock}
          title="Mot de passe réinitialisé"
          message="Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter avec vos nouveaux identifiants."
          action={{
            href: '/login',
            label: 'Se connecter',
          }}
        />
      </AuthCard>
    );
  }

  if (!token) {
    return null;
  }

  return (
    <AuthCard maxWidth="sm">
      <AuthHeader
        title="Nouveau mot de passe"
        subtitle="Choisissez un nouveau mot de passe sécurisé pour votre compte"
      />

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <PasswordInput
            label="Nouveau mot de passe"
            placeholder="Min. 8 caractères"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setErrors((prev) => ({ ...prev, newPassword: '' }));
            }}
            error={errors.newPassword}
          />
          <PasswordStrength password={newPassword} />
        </div>

        <PasswordInput
          label="Confirmer le mot de passe"
          placeholder="Répétez votre mot de passe"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setErrors((prev) => ({ ...prev, confirmPassword: '' }));
          }}
          error={errors.confirmPassword}
        />

        <AuthButton
          type="submit"
          isLoading={resetPasswordMutation.isPending}
          loadingText="Réinitialisation..."
          className="mt-2"
        >
          Réinitialiser le mot de passe
        </AuthButton>
      </form>

      <AuthFooter backLink={{ href: '/login', label: 'Retour à la connexion' }} />
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50/80">
      <Suspense
        fallback={
          <AuthCard noAnimation maxWidth="sm">
            <div className="text-center py-8">
              <LoaderCircle className="w-8 h-8 animate-spin text-sky-600 mx-auto" />
              <p className="mt-2 text-xs text-slate-500">Chargement...</p>
            </div>
          </AuthCard>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}