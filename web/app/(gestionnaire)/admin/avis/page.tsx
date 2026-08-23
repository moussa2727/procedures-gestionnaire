'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { LoadingState, EmptyState, SearchInput, FilterBar } from '@/src/components/common';
import { userService } from '@/src/services/user.service';
import { useUsersByRole, useModerateReview } from '@/src/hooks/use-users';
import { UserRole } from '@/src/types/enums';
import { User, MessageSquare, Search, RefreshCw, Star } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { toast } from 'sonner';
import type { UserResponse } from '@/src/types/user';

export default function AdminAvisPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const moderateMutation = useModerateReview();

  const { data: consultants } = useUsersByRole(UserRole.CONSULTANT);
  const consultantList: UserResponse[] = consultants || [];

  const [selectedConsultantId, setSelectedConsultantId] = useState<string>('');

  const { data: reviews, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-reviews', selectedConsultantId],
    queryFn: async () => {
      if (!selectedConsultantId) return [];
      const res = await userService.getConsultantPublicProfile(selectedConsultantId);
      return res.reviews || [];
    },
    enabled: !!selectedConsultantId,
  });

  const filteredReviews = useMemo(() => {
    if (!reviews) return [];
    const list = Array.isArray(reviews) ? reviews : [];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return list.filter((r: any) => r.comment?.toLowerCase().includes(q));
    }
    return list;
  }, [reviews, searchTerm]);

  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleModerate = async () => {
    if (!selectedReviewId || !moderationReason.trim()) return;
    try {
      await moderateMutation.mutateAsync({ reviewId: selectedReviewId, payload: { reason: moderationReason.trim() } });
      toast.success('Avis modéré avec succès');
      setIsModalOpen(false);
      setModerationReason('');
      setSelectedReviewId(null);
      refetch();
    } catch {
      toast.error('Erreur lors de la modération');
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Avis</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Modérez les avis laissés par les étudiants sur les consultants.
        </p>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <select
            value={selectedConsultantId}
            onChange={(e) => setSelectedConsultantId(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500"
          >
            <option value="">Sélectionner un consultant</option>
              {consultantList.map((c: UserResponse) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Rechercher un avis..."
            className="md:max-w-xs"
          />
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:border-sky-300 hover:text-sky-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </button>
      </div>

      {!selectedConsultantId ? (
        <EmptyState title="Sélectionnez un consultant" description="Choisissez un consultant pour voir ses avis." />
      ) : isLoading ? (
        <LoadingState message="Chargement des avis..." />
      ) : error ? (
        <div className="p-6 text-center text-sm text-red-600">Erreur lors du chargement</div>
      ) : filteredReviews.length === 0 ? (
        <EmptyState title="Aucun avis" description="Ce consultant n'a pas encore reçu d'avis." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredReviews.map((review: any) => (
            <div
              key={review.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {review.student?.firstName} {review.student?.lastName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{review.student?.email}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`w-4 h-4 ${star <= (review.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                ))}
              </div>
              <p className="mt-2 text-sm text-slate-600 line-clamp-2">{review.comment}</p>
              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReviewId(review.id);
                    setIsModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Modérer le commentaire
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Modérer l'évaluation</h3>
            <p className="mt-2 text-xs text-slate-600">
              Indiquez la raison de la modération de ce commentaire.
            </p>
            <div className="mt-4">
              <textarea
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                placeholder="Ex: Contenu inapproprié, propos diffamatoires..."
                rows={3}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setModerationReason('');
                  setSelectedReviewId(null);
                }}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleModerate}
                disabled={moderateMutation.isPending || !moderationReason.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {moderateMutation.isPending ? 'Modération...' : 'Confirmer la modération'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
