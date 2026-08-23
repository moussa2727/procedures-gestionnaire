// app/etudiant/mon-profil/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  User,
  Mail,
  Phone,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Smartphone,
  Globe,
  Calendar,
  Clock,
  XCircle,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';

// ===== HOOKS =====
import {
  useMyProfile,
  useUpdateMyProfile,
  useUpdateMyPhoto,
  useMySessions,
  useRevokeMySession,
} from '@/src/hooks/use-users';
import { useLogout } from '@/src/hooks/use-auth';

// ===== COMPOSANTS =====
import {
  LoadingState,
  EmptyState,
  ConfirmationModal,
} from '@/src/components/common';

// ===== SCHEMA & TYPES =====
import { updateProfileSchema, type UpdateProfileFormValues } from '@/src/schemas/user.schema';
import type { SessionResponse } from '@/src/types/user';

// ===== HELPERS =====
import { formatDateTime } from '@/src/lib/date-helpers';


export default function MonProfilPage() {
  const router = useRouter();

  // ===== DATA =====
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useMyProfile();
  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useMySessions();

  // ===== STATE =====
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // ===== FORM =====
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    },
  });

  // ===== MUTATIONS =====
  const updateProfileMutation = useUpdateMyProfile();
  const updatePhotoMutation = useUpdateMyPhoto();
  const revokeSessionMutation = useRevokeMySession();
  const logoutMutation = useLogout();

  // ===== PRE-FILL FORM =====
  useEffect(() => {
    if (profile) {
      const p = profile as any;
      setValue('firstName', p.firstName || '');
      setValue('lastName', p.lastName || '');
      setValue('email', p.email || '');
      setValue('phone', p.phone || '');
    }
  }, [profile, setValue]);

  // ===== HANDLERS =====
  const onSubmit = async (data: UpdateProfileFormValues) => {
    try {
      await updateProfileMutation.mutateAsync(data);
      setIsEditing(false);
      refetchProfile();
    } catch {
      // Error handled by hook
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (file.size > maxSize) {
      toast.error('L\'image ne doit pas depasser 5 Mo');
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      toast.error('Format non supporte. Utilisez JPEG, PNG ou WEBP.');
      return;
    }

    setIsUploading(true);
    try {
      await updatePhotoMutation.mutateAsync(file);
      refetchProfile();
      toast.success('Photo mise a jour avec succes');
    } catch {
      // Error handled by hook
    } finally {
      setIsUploading(false);
    }
  };

  const handleRevokeSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setShowRevokeModal(true);
  };

  const confirmRevokeSession = async () => {
    if (!selectedSessionId) return;
    await revokeSessionMutation.mutateAsync(selectedSessionId);
    setShowRevokeModal(false);
    setSelectedSessionId(null);
    refetchSessions();
  };

  const handleLogoutAll = () => {
    setShowLogoutModal(true);
  };

  const confirmLogoutAll = async () => {
    await logoutMutation.mutateAsync();
    setShowLogoutModal(false);
    router.push('/');
  };

  const getDeviceIcon = (deviceInfo?: string | null) => {
    if (!deviceInfo) return <Smartphone className="w-4 h-4" />;
    const info = deviceInfo.toLowerCase();
    if (info.includes('mobile') || info.includes('android') || info.includes('iphone')) {
      return <Smartphone className="w-4 h-4" />;
    }
    if (info.includes('chrome') || info.includes('firefox') || info.includes('safari')) {
      return <Globe className="w-4 h-4" />;
    }
    return <Smartphone className="w-4 h-4" />;
  };

  // ===== LOADING =====
  if (profileLoading || sessionsLoading) {
    return (
      <section className="w-full bg-white py-12 sm:py-16 lg:py-20 min-h-screen">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <LoadingState message="Chargement de votre profil..." />
        </div>
      </section>
    );
  }

  // ===== NOT FOUND =====
  if (!profile) {
    return (
      <section className="w-full bg-white py-12 sm:py-16 lg:py-20 min-h-screen">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <EmptyState
            title="Profil introuvable"
            description="Impossible de charger votre profil. Veuillez vous reconnecter."
            icon={<User className="w-7 h-7" />}
            action={
              <button
                type="button"
                onClick={() => router.push('/')}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Retour a l'accueil
              </button>
            }
          />
        </div>
      </section>
    );
  }

  const p = profile as any;
  const currentSession = sessions?.find((s: SessionResponse) => s.isCurrent);

  // ===== RENDER =====
  return (
    <section className="w-full bg-white py-8 sm:py-12 min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 mb-4">
            <User className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-medium tracking-wide text-sky-700">Mon profil</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            Mon profil
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Consultez et modifiez vos informations personnelles, et gerez vos sessions actives.
          </p>
        </div>

        {/* Profile Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs mb-6">
          {/* Avatar & Name */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-6 border-b border-slate-100">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-3xl font-bold text-slate-600 overflow-hidden">
                {p.photo ? (
                  <img src={p.photo} alt="Photo de profil" className="w-full h-full object-cover" />
                ) : (
                  `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`
                )}
              </div>
              <label
                htmlFor="photo-upload"
                className={`absolute bottom-0 right-0 p-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-full cursor-pointer transition-colors shadow-xs ${
                  isUploading ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900">
                {p.firstName} {p.lastName}
              </h2>
              <p className="text-sm text-slate-500">{p.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  p.isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    p.isActive ? 'bg-emerald-500' : 'bg-red-500'
                  }`} />
                  {p.isActive ? 'Actif' : 'Inactif'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  p.isOnline
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    p.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                  }`} />
                  {p.isOnline ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Modifier
                </button>
              )}
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Prenom
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    {...register('firstName')}
                    disabled={!isEditing}
                    className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-all ${
                      !isEditing ? 'bg-slate-50 cursor-not-allowed' : 'border-slate-300'
                    } ${errors.firstName ? 'border-red-300' : 'border-slate-300'}`}
                  />
                </div>
                {errors.firstName && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
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
                    {...register('lastName')}
                    disabled={!isEditing}
                    className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-all ${
                      !isEditing ? 'bg-slate-50 cursor-not-allowed' : 'border-slate-300'
                    } ${errors.lastName ? 'border-red-300' : 'border-slate-300'}`}
                  />
                </div>
                {errors.lastName && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.lastName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    {...register('email')}
                    type="email"
                    disabled={!isEditing}
                    className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-all ${
                      !isEditing ? 'bg-slate-50 cursor-not-allowed' : 'border-slate-300'
                    } ${errors.email ? 'border-red-300' : 'border-slate-300'}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Telephone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    {...register('phone')}
                    disabled={!isEditing}
                    placeholder="+33 6 12 34 56 78"
                    className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-all ${
                      !isEditing ? 'bg-slate-50 cursor-not-allowed' : 'border-slate-300'
                    } ${errors.phone ? 'border-red-300' : 'border-slate-300'}`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            {/* Role & Creation date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-400">Role</p>
                <p className="font-medium text-slate-800">{p.role}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-400">Membre depuis</p>
                <p className="font-medium text-slate-800">{formatDateTime(p.createdAt)}</p>
              </div>
            </div>

            {/* Form Actions */}
            {isEditing && (
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    reset();
                  }}
                  className="px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !isDirty}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Enregistrer
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Sessions Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg font-bold text-slate-900">Sessions actives</h2>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {sessions?.length || 0}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refetchSessions()}
                className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                title="Actualiser"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {sessions && sessions.length > 1 && (
                <button
                  type="button"
                  onClick={handleLogoutAll}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Tout deconnecter
                </button>
              )}
            </div>
          </div>

          {sessions && sessions.length > 0 ? (
            <div className="mt-4 space-y-3">
              {sessions.map((session: SessionResponse) => {
                const isCurrent = session.isCurrent;

                return (
                  <div
                    key={session.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-sky-50/50 border-sky-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        isCurrent ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {getDeviceIcon(session.deviceInfo)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">
                            {session.deviceInfo || 'Appareil inconnu'}
                          </p>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1 h-1 rounded-full bg-emerald-500" />
                              Actuelle
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-0.5 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDateTime(session.createdAt)}
                          </span>
                          {session.ipAddress && (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {session.ipAddress}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expire le {formatDateTime(session.expiresAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(session.id)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Deconnecter
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 p-8 text-center bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-sm text-slate-500">Aucune session active</p>
            </div>
          )}
        </div>

        {/* Modals */}

        {/* Revoke Session Modal */}
        {showRevokeModal && (
          <ConfirmationModal
            isOpen={true}
            onClose={() => { setShowRevokeModal(false); setSelectedSessionId(null); }}
            onConfirm={confirmRevokeSession}
            title="Deconnecter cette session"
            subtitle="Cette session sera immediatement terminee"
            variant="danger"
            isPending={revokeSessionMutation.isPending}
            confirmLabel={revokeSessionMutation.isPending ? 'Deconnexion...' : 'Confirmer la deconnexion'}
            details={[
              { label: 'Action', value: 'Revocation de session' },
            ]}
            warningMessage="Cette action est irreversible. L'utilisateur devra se reconnecter sur cet appareil."
          />
        )}

        {/* Logout All Modal */}
        {showLogoutModal && (
          <ConfirmationModal
            isOpen={true}
            onClose={() => setShowLogoutModal(false)}
            onConfirm={confirmLogoutAll}
            title="Deconnecter toutes les sessions"
            subtitle="Toutes vos sessions seront terminees sauf celle-ci"
            variant="danger"
            isPending={logoutMutation.isPending}
            confirmLabel={logoutMutation.isPending ? 'Deconnexion...' : 'Tout deconnecter'}
            details={[
              { label: 'Sessions actives', value: `${sessions?.length || 0}` },
            ]}
            warningMessage="Vous serez deconnecte de tous vos appareils. Vous devrez vous reconnecter sur chacun d'eux."
          />
        )}
      </div>
    </section>
  );
}