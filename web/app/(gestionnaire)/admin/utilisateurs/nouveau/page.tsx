'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useCreateUser } from '@/src/hooks/use-users';
import { createUserSchema, type CreateUserFormValues } from '@/src/schemas/user.schema';
import { UserRole } from '@/src/types/enums';
import { AuthButton } from '@/src/components/common/auth/AuthButton';
import { AuthCard } from '@/src/components/common/auth/AuthCard';
import { AuthHeader } from '@/src/components/common/auth/AuthHeader';
import { AuthInput } from '@/src/components/common/auth/AuthInput';
import { User, UserRound, Mail, Phone, Shield } from 'lucide-react';

export default function AdminNouvelUtilisateurPage() {
  const createMutation = useCreateUser();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: UserRole.ETUDIANT,
    },
  });

  const onSubmit = async (data: CreateUserFormValues) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Utilisateur créé');
    } catch {
      toast.error('Erreur lors de la création');
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Nouvel utilisateur</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Créez un compte consultant ou étudiant.
        </p>
      </header>

      <AuthCard maxWidth="md">
        <AuthHeader title="Créer un utilisateur" subtitle="Remplissez les informations ci-dessous" />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <AuthInput
              label="Prénom"
              icon={User}
              name="firstName"
              register={register}
              error={errors.firstName?.message}
              placeholder="Jean"
            />
            <AuthInput
              label="Nom"
              icon={UserRound}
              name="lastName"
              register={register}
              error={errors.lastName?.message}
              placeholder="Dupont"
            />
          </div>
          <AuthInput
            label="Email"
            icon={Mail}
            type="email"
            name="email"
            register={register}
            error={errors.email?.message}
            placeholder="exemple@email.fr"
          />
          <AuthInput
            label="Téléphone"
            icon={Phone}
            type="tel"
            name="phone"
            register={register}
            error={errors.phone?.message}
            placeholder="+223 91 83 09 41"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                {...register('role')}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-sky-500"
              >
                <option value={UserRole.CONSULTANT}>Consultant</option>
                <option value={UserRole.ETUDIANT}>Étudiant</option>
              </select>
            </div>
            {errors.role && <p className="mt-1 text-sm text-red-500">{errors.role.message}</p>}
          </div>
          <AuthButton type="submit" isLoading={isSubmitting} loadingText="Création...">
            Créer l'utilisateur
          </AuthButton>
        </form>
      </AuthCard>
    </div>
  );
}
