// components/admin/users/AdminUserEditModal.tsx
'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, User, Phone, Shield, GraduationCap, AlertCircle } from 'lucide-react';
import { Modal } from '@/src/components/common';
import {
  updateProfileSchema,
  type UpdateProfileFormValues,
} from '@/src/schemas/user.schema';
import { UserRole } from '@/src/types/enums';
import type { UserResponse } from '@/src/types/user';

interface AdminUserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserResponse | null;
  onUpdate: (values: UpdateProfileFormValues) => Promise<void>;
  isPending?: boolean;
}

export function AdminUserEditModal({
  isOpen,
  onClose,
  user,
  onUpdate,
  isPending = false,
}: AdminUserEditModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (user && isOpen) {
      reset({
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
      });
    }
  }, [user, isOpen, reset]);

  const onSubmit = async (values: UpdateProfileFormValues) => {
    await onUpdate(values);
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!user) return null;

  const roleLabels = {
    [UserRole.ADMIN]: 'Administrateur',
    [UserRole.CONSULTANT]: 'Consultant',
    [UserRole.ETUDIANT]: 'Étudiant',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Modifier l'utilisateur"
      subtitle={`${user.firstName} ${user.lastName}`}
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
            {isPending ? 'Mise à jour...' : 'Enregistrer'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Rôle actuel (lecture seule) */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
          <p>
            <span className="font-semibold text-slate-500">Rôle :</span>{' '}
            <span className="font-medium text-slate-800">{roleLabels[user.role]}</span>
          </p>
          <p>
            <span className="font-semibold text-slate-500">Statut :</span>{' '}
            <span className={`font-medium ${user.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {user.isActive ? 'Actif' : 'Inactif'}
            </span>
          </p>
          <p>
            <span className="font-semibold text-slate-500">ID :</span>{' '}
            <span className="font-mono text-slate-500">{user.id}</span>
          </p>
        </div>

        {/* Informations à modifier */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Prénom
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Prénom"
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
              Nom
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Nom"
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                placeholder="email@exemple.com"
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
      </div>
    </Modal>
  );
}