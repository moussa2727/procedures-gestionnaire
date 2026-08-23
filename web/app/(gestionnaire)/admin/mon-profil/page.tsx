'use client';

import { useQuery } from '@tanstack/react-query';
import { LoadingState } from '@/src/components/common';
import { userService } from '@/src/services/user.service';
import type { SessionResponse } from '@/src/types/user';
import { User, Mail, Shield, LogOut, Monitor } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { updateProfileSchema, type UpdateProfileFormValues } from '@/src/schemas/user.schema';
import { useUpdateMyProfile, useUpdateMyPhoto } from '@/src/hooks/use-users';
import { useLogoutAll, useLogout } from '@/src/hooks/use-auth';

export default function AdminMonProfilPage() {
  const [isEditing, setIsEditing] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['admin-profile'],
    queryFn: () => userService.getMyProfile(),
  });

  const { data: sessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: () => userService.listMySessions(),
  });

  const updateProfileMutation = useUpdateMyProfile();
  const updatePhotoMutation = useUpdateMyPhoto();
  const logoutAllMutation = useLogoutAll();
  const logoutMutation = useLogout();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    values: {
      email: profile?.email || '',
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      phone: profile?.phone || '',
    },
  });

  const onUpdateProfile = async (data: UpdateProfileFormValues) => {
    await updateProfileMutation.mutateAsync(data);
    setIsEditing(false);
    toast.success('Profil mis à jour');
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await updatePhotoMutation.mutateAsync(file);
    toast.success('Photo mise à jour');
  };

  const handleLogoutAll = async () => {
    await logoutAllMutation.mutateAsync();
  };

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

  if (isLoading) {
    return <LoadingState message="Chargement du profil..." />;
  }

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-600">Impossible de charger le profil</p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Mon profil</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Gérez vos informations personnelles et vos sessions actives.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-900">Informations personnelles</h3>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700"
              >
                Modifier
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit(onUpdateProfile)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Prénom</label>
                  <input {...register('firstName')} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500" />
                  {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nom</label>
                  <input {...register('lastName')} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500" />
                  {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email</label>
                <input {...register('email')} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500" />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Téléphone</label>
                <input {...register('phone')} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500" />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-colors">
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 overflow-hidden">
                  {profile.photo ? (
                    <img src={profile.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{profile.firstName} {profile.lastName}</p>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {profile.email}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Téléphone</span>
                  <p className="text-slate-900 font-medium mt-0.5">{profile.phone || 'Non renseigné'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Rôle</span>
                  <p className="text-slate-900 font-medium mt-0.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-sky-600" />
                    Administrateur
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Photo de profil</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 overflow-hidden">
                {profile.photo ? (
                  <img src={profile.photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8" />
                )}
              </div>
              <label className="cursor-pointer px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                Changer la photo
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Sessions actives</h3>
            {isLoadingSessions ? (
              <LoadingState message="Chargement..." />
            ) : sessions && sessions.length > 0 ? (
              <div className="space-y-2">
                {sessions.map((session: SessionResponse) => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-700">{session.deviceInfo || 'Appareil inconnu'}</p>
                        <p className="text-slate-500">{session.ipAddress || 'IP inconnue'}</p>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <button
                        type="button"
                        onClick={async () => {
                          await userService.revokeMySession(session.id);
                          toast.success('Session révoquée');
                        }}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Révoquer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Aucune session active</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Actions</h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleLogoutAll}
                disabled={logoutAllMutation.isPending}
                className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Déconnecter toutes les sessions
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
