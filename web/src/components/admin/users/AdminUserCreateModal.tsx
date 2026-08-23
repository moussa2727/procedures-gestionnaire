// components/admin/users/AdminUserCreateModal.tsx
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, User, Lock, Phone, Shield, GraduationCap, AlertCircle } from 'lucide-react';
import { Modal } from '@/src/components/common';
import {
  createUserSchema,
  type CreateUserFormValues,
} from '@/src/schemas/user.schema';
import { UserRole } from '@/src/types/enums';

interface AdminUserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (values: CreateUserFormValues) => Promise<void>;
  isPending?: boolean;
}

export function AdminUserCreateModal({
  isOpen,
  onClose,
  onCreate,
  isPending = false,
}: AdminUserCreateModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      role: UserRole.ETUDIANT,
      isActive: true,
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (values: CreateUserFormValues) => {
    await onCreate(values);
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nouvel utilisateur"
      subtitle="Créer un compte utilisateur"
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={!isValid || isPending}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            {isPending ? 'Création...' : 'Créer l\'utilisateur'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Identité */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Prénom <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Jean"
                {...register('firstName')}
                className={`w-full pl-10 pr-3.5 py-2.5 bg-white border ${
                  errors.firstName ? 'border-red-500' : 'border-slate-300 hover:border-sky-300'
                } rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors`}
              />
            </div>
            {errors.firstName && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.firstName.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Nom <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Dupont"
                {...register('lastName')}
                className={`w-full pl-10 pr-3.5 py-2.5 bg-white border ${
                  errors.lastName ? 'border-red-500' : 'border-slate-300 hover:border-sky-300'
                } rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors`}
              />
            </div>
            {errors.lastName && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        {/* Email et téléphone */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                placeholder="jean.dupont@email.com"
                {...register('email')}
                className={`w-full pl-10 pr-3.5 py-2.5 bg-white border ${
                  errors.email ? 'border-red-500' : 'border-slate-300 hover:border-sky-300'
                } rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Téléphone
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="tel"
                placeholder="06 12 34 56 78"
                {...register('phone')}
                className={`w-full pl-10 pr-3.5 py-2.5 bg-white border ${
                  errors.phone ? 'border-red-500' : 'border-slate-300 hover:border-sky-300'
                } rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors`}
              />
            </div>
            {errors.phone && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.phone.message}
              </p>
            )}
          </div>
        </div>

        {/* Mot de passe */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Mot de passe <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="password"
              placeholder="••••••••"
              {...register('password')}
              className={`w-full pl-10 pr-3.5 py-2.5 bg-white border ${
                errors.password ? 'border-red-500' : 'border-slate-300 hover:border-sky-300'
              } rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors`}
            />
          </div>
          {errors.password && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Rôle et statut */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Rôle <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                {...register('role')}
                className={`w-full pl-10 pr-3.5 py-2.5 bg-white border ${
                  errors.role ? 'border-red-500' : 'border-slate-300 hover:border-sky-300'
                } rounded-xl text-sm text-slate-900 focus:outline-none focus:border-sky-600 transition-colors`}
              >
                <option value={UserRole.ETUDIANT}>Étudiant</option>
                <option value={UserRole.CONSULTANT}>Consultant</option>
              </select>
            </div>
            {errors.role && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.role.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Statut
            </label>
            <div className="relative">
              <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                {...register('isActive')}
                className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 hover:border-sky-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-sky-600 transition-colors"
              >
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </select>
            </div>
          </div>
        </div>

        {selectedRole === UserRole.CONSULTANT && (
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Le consultant pourra être assigné à des destinations et gérer des procédures.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}