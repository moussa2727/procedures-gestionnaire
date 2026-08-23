// app/(gestionnaire)/admin/utilisateurs/[id]/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { LoadingState, EmptyState } from '@/src/components/common';
import { useUser, useUpdateUser, useToggleUserStatus, usePromoteToConsultant, useDeleteUser, useRestoreUser } from '@/src/hooks/use-users';
import type { UserResponse, UpdateUserPayload } from '@/src/types/user';
import { UserRole } from '@/src/types/enums';
import { ArrowLeft, Mail, Phone, Shield, UserCog, Trash2, RotateCcw, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

export default function AdminUtilisateurDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  const { data: user, isLoading, error, refetch } = useUser(userId);
  const updateMutation = useUpdateUser(userId);
  const toggleStatusMutation = useToggleUserStatus();
  const promoteMutation = usePromoteToConsultant();
  const deleteMutation = useDeleteUser();
  const restoreMutation = useRestoreUser();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateUserPayload>({});

  const target = user as UserResponse | undefined;

  const handleEdit = () => {
    if (!target) return;
    setEditForm({
      email: target.email,
      firstName: target.firstName,
      lastName: target.lastName,
      phone: target.phone || '',
      isActive: target.isActive,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!target) return;
    try {
      await updateMutation.mutateAsync(editForm);
      toast.success('Utilisateur mis à jour');
      setIsEditing(false);
      refetch();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleToggleStatus = async () => {
    if (!target) return;
    try {
      await toggleStatusMutation.mutateAsync({ id: target.id, isActive: !target.isActive });
      toast.success(target.isActive ? 'Utilisateur désactivé' : 'Utilisateur activé');
      refetch();
    } catch {
      toast.error('Erreur');
    }
  };

  const handlePromote = async () => {
    if (!target) return;
    try {
      await promoteMutation.mutateAsync(target.id);
      toast.success('Promu consultant');
      refetch();
    } catch {
      toast.error('Erreur');
    }
  };

  const handleDelete = async () => {
    if (!target) return;
    if (!confirm('Confirmer la suppression de cet utilisateur ?')) return;
    try {
      await deleteMutation.mutateAsync(target.id);
      toast.success('Utilisateur supprimé');
    } catch {
      toast.error('Erreur');
    }
  };

  const handleRestore = async () => {
    if (!target) return;
    try {
      await restoreMutation.mutateAsync(target.id);
      toast.success('Utilisateur restauré');
      refetch();
    } catch {
      toast.error('Erreur');
    }
  };

  if (isLoading) return <LoadingState message="Chargement de l'utilisateur..." />;
  if (error || !target) return <div className="p-6 text-center text-sm text-red-600">Utilisateur introuvable</div>;

  const roleLabels: Record<UserRole, string> = {
    [UserRole.ADMIN]: 'Administrateur',
    [UserRole.CONSULTANT]: 'Consultant',
    [UserRole.ETUDIANT]: 'Étudiant',
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link href="/admin/utilisateurs" className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700">
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            {target.firstName} {target.lastName}
          </h2>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Profil</h3>
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom</label>
                    <input type="text" value={editForm.firstName || ''} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nom</label>
                    <input type="text" value={editForm.lastName || ''} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                    <input type="email" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
                    <input type="tel" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleSave} disabled={updateMutation.isPending} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-colors">Enregistrer</button>
                  <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors">Annuler</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Email</span>
                  <p className="text-slate-900 font-medium mt-0.5 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" />{target.email}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Téléphone</span>
                  <p className="text-slate-900 font-medium mt-0.5 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />{target.phone || '—'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Rôle</span>
                  <p className="text-slate-900 font-medium mt-0.5 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-slate-400" />{roleLabels[target.role]}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Statut</span>
                  <p className="text-slate-900 font-medium mt-0.5">{target.isActive ? 'Actif' : 'Inactif'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Actions</h3>
            <div className="space-y-2">
              {!isEditing && (
                <button type="button" onClick={handleEdit} className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                  <UserCog className="w-4 h-4" /> Modifier
                </button>
              )}
              <button type="button" onClick={handleToggleStatus} className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                {target.isActive ? 'Désactiver' : 'Activer'}
              </button>
              {target.role === UserRole.ETUDIANT && (
                <button type="button" onClick={handlePromote} disabled={promoteMutation.isPending} className="w-full px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" /> Promouvoir consultant
                </button>
              )}
              {target.isDeleted ? (
                <button type="button" onClick={handleRestore} className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Restaurer
                </button>
              ) : (
                <button type="button" onClick={handleDelete} className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" /> Supprimer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
