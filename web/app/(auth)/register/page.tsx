// app/(auth)/register/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { AuthButton } from '@/src/components/common/auth/AuthButton';
import { AuthCard } from '@/src/components/common/auth/AuthCard';
import { AuthHeader } from '@/src/components/common/auth/AuthHeader';
import { AuthInput } from '@/src/components/common/auth/AuthInput';
import { PasswordInput } from '@/src/components/common/auth/PasswordInput';
import { PasswordStrength } from '@/src/components/common/auth/PasswordStrength';
import { useRegister } from '@/src/hooks/use-auth';
import { registerSchema } from '@/src/schemas/auth.schema';
import { SocialAuth } from '@/src/components/common/auth/SocialAuth';
import { User, UserRound, Mail, Phone } from 'lucide-react';

export default function RegisterPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    terms: false,
  });

  const registerMutation = useRegister();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setFormErrors((prev) => ({ ...prev, confirmPassword: 'Les mots de passe ne correspondent pas.' }));
      return;
    }

    if (!formData.terms) {
      setFormErrors((prev) => ({ ...prev, terms: 'Vous devez accepter les conditions d\'utilisation.' }));
      return;
    }

    try {
      registerSchema.parse({
        email: formData.email,
        password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
      });
    } catch (error: unknown) {
      const errMap: Record<string, string> = {};
      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as { issues: { path: string[]; message: string }[] };
        zodError.issues.forEach((item) => {
          errMap[item.path[0]] = item.message;
        });
        setFormErrors(errMap);
      }
      return;
    }

    registerMutation.mutate({
      email: formData.email,
      password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone || undefined,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-6 bg-slate-50/80">
      <AuthCard maxWidth="lg" className="py-5 sm:py-6">
        <AuthHeader 
          title="Créer un compte" 
          subtitle="Rejoignez la plateforme et démarrez vos démarches d'orientation" 
        />

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Grille 2 colonnes pour compacter la hauteur (H) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-start">
            {/* Colonne 1 : Coordonnées & Identité */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <AuthInput
                  label="Prénom"
                  icon={User}
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  error={formErrors.firstName}
                  placeholder="Jean"
                  maxLength={50}
                />
                <AuthInput
                  label="Nom"
                  icon={UserRound}
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  error={formErrors.lastName}
                  placeholder="Dupont"
                  maxLength={50}
                />
              </div>

              <AuthInput
                label="Adresse e-mail"
                icon={Mail}
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                error={formErrors.email}
                placeholder="exemple@email.fr"
                maxLength={100}
              />

              <AuthInput
                label="Téléphone"
                icon={Phone}
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+33 6 12 34 56 78"
                maxLength={20}
              />
            </div>

            {/* Colonne 2 : Sécurité & Validation */}
            <div className="space-y-2.5">
              <div>
                <PasswordInput
                  label="Mot de passe"
                  placeholder="Min. 8 caractères"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFormErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  error={formErrors.password}
                />
                <PasswordStrength password={password} />
              </div>

              <PasswordInput
                label="Confirmer le mot de passe"
                placeholder="Répétez votre mot de passe"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setFormErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }}
                error={formErrors.confirmPassword}
              />

              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    id="terms"
                    type="checkbox"
                    name="terms"
                    checked={formData.terms}
                    onChange={handleInputChange}
                    className="mt-0.5 w-3.5 h-3.5 text-sky-600 rounded border-slate-300 focus:ring-0 focus:border-sky-500 transition-colors"
                  />
                  <span className="text-[11px] leading-tight text-slate-600">
                    J&apos;accepte les{' '}
                    <Link href="/conditions" className="text-sky-600 hover:text-sky-700 font-semibold underline underline-offset-2">
                      conditions
                    </Link>{' '}
                    et la{' '}
                    <Link href="/politique" className="text-sky-600 hover:text-sky-700 font-semibold underline underline-offset-2">
                      politique de confidentialité
                    </Link>
                  </span>
                </label>
                {formErrors.terms && (
                  <p className="text-[11px] font-medium text-rose-500 mt-1">{formErrors.terms}</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions compactes */}
          <div className="pt-1 space-y-2.5">
            <AuthButton
              type="submit"
              isLoading={registerMutation.isPending}
              loadingText="Création du compte..."
            >
              Créer mon compte
            </AuthButton>

            <SocialAuth />

            <div className="text-center pt-1">
              <p className="text-xs text-slate-500">
                Déjà inscrit ?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-sky-600 hover:text-sky-700 transition-colors"
                >
                  Se connecter
                </Link>
              </p>
            </div>
          </div>
        </form>
      </AuthCard>
    </div>
  );
}