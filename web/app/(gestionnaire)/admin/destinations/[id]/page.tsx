'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { LoadingState, EmptyState, ConfirmationModal } from '@/src/components/common';
import { destinationService } from '@/src/services/destination.service';
import { useDestination, useUpdateDestination, useRemoveDestination, useRestoreDestination, useHardDeleteDestination } from '@/src/hooks/use-destinations';
import type { DestinationResponse } from '@/src/types/destination';
import { MapPin, Calendar, User, Users, Trash2, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AdminDestinationDetailPage() {
  const params = useParams();
  const destinationId = params.id as string;

  const { data: destination, isLoading, error, refetch } = useDestination(destinationId);
  const updateMutation = useUpdateDestination(destinationId);
  const removeMutation = useRemoveDestination();
  const restoreMutation = useRestoreDestination();
  const hardDeleteMutation = useHardDeleteDestination();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHardDeleteModal, setShowHardDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ country: '', description: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const target = destination as DestinationResponse | undefined;

  useEffect(() => {
    if (target) {
      setEditForm({ country: target.country, description: target.description || '' });
    }
  }, [target]);

  const handleUpdate = async () => {
    if (!target) return;
    try {
      await updateMutation.mutateAsync({
        country: editForm.country,
        description: editForm.description,
        imageFile: imageFile || undefined,
      });
      toast.success('Destination mise à jour');
      setIsEditing(false);
      refetch();
    } catch {
      toast.error('Erreur');
    }
  };

  const handleSoftDelete = async () => {
    if (!target) return;
    try {
      await removeMutation.mutateAsync(target.id);
      toast.success('Destination supprimée');
      setShowDeleteModal(false);
      refetch();
    } catch {
      toast.error('Erreur');
    }
  };

  const handleRestore = async () => {
    if (!target) return;
    try {
      await restoreMutation.mutateAsync(target.id);
      toast.success('Destination restaurée');
      refetch();
    } catch {
      toast.error('Erreur');
    }
  };

  const handleHardDelete = async () => {
    if (!target) return;
    try {
      await hardDeleteMutation.mutateAsync(target.id);
      toast.success('Destination supprimée définitivement');
      setShowHardDeleteModal(false);
    } catch {
      toast.error('Erreur');
    }
  };

  if (isLoading) return <LoadingState message="Chargement..." />;
  if (error || !target) return <div className="p-6 text-center text-sm text-red-600">Destination introuvable</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link href="/admin/destinations" className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700">
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">{target.country}</h2>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-900">Informations</h3>
            {!isEditing ? (
              <button type="button" onClick={() => setIsEditing(true)} className="text-xs font-semibold text-sky-600 hover:text-sky-700">
                Modifier
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleUpdate} disabled={updateMutation.isPending} className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors">
                  Enregistrer
                </button>
                <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                  Annuler
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Pays</label>
                <input value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={4} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Image</label>
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 overflow-hidden">
                  {target.photo ? (
                    <img src={target.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <MapPin className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{target.country}</p>
                  <p className="text-sm text-slate-500">{target.description || 'Pas de description'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Créée le</span>
                  <p className="text-slate-900 font-medium mt-0.5">{new Date(target.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Statut</span>
                  <p className="text-slate-900 font-medium mt-0.5">{target.isDeleted ? 'Supprimée' : 'Active'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Actions</h3>
            <div className="space-y-2">
              <Link href={`/admin/destinations/${target.id}/consultants`} className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                <Users className="w-4 h-4" />
                Gérer les consultants
              </Link>
              {target.isDeleted ? (
                <button type="button" onClick={handleRestore} className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Restaurer
                </button>
              ) : (
                <button type="button" onClick={() => setShowDeleteModal(true)} className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              )}
              {target.isDeleted && (
                <button type="button" onClick={() => setShowHardDeleteModal(true)} className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Supprimer définitivement
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleSoftDelete}
        title="Supprimer la destination"
        subtitle="Cette action est réversible. La destination sera marquée comme supprimée."
        confirmLabel="Supprimer"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={showHardDeleteModal}
        onClose={() => setShowHardDeleteModal(false)}
        onConfirm={handleHardDelete}
        title="Supprimer définitivement"
        subtitle="Cette action est irréversible. La destination sera supprimée de la base de données."
        confirmLabel="Supprimer définitivement"
        variant="danger"
      />
    </div>
  );
}
