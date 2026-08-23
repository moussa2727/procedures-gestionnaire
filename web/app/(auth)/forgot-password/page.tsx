// app/(auth)/forgot-password/page.tsx
'use client';

import { AuthButton } from '@/src/components/common/auth/AuthButton';
import { AuthCard } from '@/src/components/common/auth/AuthCard';
import { AuthFooter } from '@/src/components/common/auth/AuthFooter';
import { AuthHeader } from '@/src/components/common/auth/AuthHeader';
import { AuthInput } from '@/src/components/common/auth/AuthInput';
import { AuthSuccess } from '@/src/components/common/auth/AuthSuccess';
import { useForgotPassword } from '@/src/hooks/use-auth';
import { Mail } from 'lucide-react';
import { useState, FormEvent } from 'react';
import { forgotPasswordSchema } from '@/src/schemas/auth.schema';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [submitted, setSubmitted] = useState(false);

  const forgotPasswordMutation = useForgotPassword();

  const validateForm = (): boolean => {
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (parsed.success) {
      setErrors({});
      return true;
    }

    const newErrors: Record<string, string> = {};
    parsed.error.issues.forEach((iss) => {
      const key = iss.path[0] as string;
      newErrors[key] = iss.message;
    });
    setErrors(newErrors);
    return false;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    forgotPasswordMutation.mutate(
      { email },
      {
        onSuccess: () => {
          setSubmitted(true);
        },
      }
    );
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50/80">
        <AuthCard maxWidth="sm">
          <AuthSuccess
            icon={Mail}
            title="E-mail envoyé"
            message={`Si un compte existe avec l'adresse ${email}, vous recevrez un lien de réinitialisation sécurisé dans quelques instants.`}
            action={{
              href: '/login',
              label: 'Retour à la connexion',
            }}
          />
        </AuthCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50/80">
      <AuthCard maxWidth="sm">
        <AuthHeader
          title="Mot de passe oublié"
          subtitle="Saisissez votre e-mail pour recevoir un lien de réinitialisation"
        />

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <AuthInput
            label="Adresse e-mail"
            icon={Mail}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((prev) => ({ ...prev, email: '' }));
            }}
            error={errors.email}
            autoComplete="email"
            placeholder="exemple@email.fr"
          />

          <AuthButton
            type="submit"
            isLoading={forgotPasswordMutation.isPending}
            loadingText="Envoi en cours..."
            className="mt-2"
          >
            Envoyer le lien de réinitialisation
          </AuthButton>
        </form>

        <AuthFooter backLink={{ href: '/login', label: 'Retour à la connexion' }} />
      </AuthCard>
    </div>
  );
}