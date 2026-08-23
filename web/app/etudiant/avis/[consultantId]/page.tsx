// app/etudiant/avis/[consultantId]/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Star,
  StarHalf,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  MessageSquare,
  Clock,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

// ===== HOOKS =====
import {
  useConsultantPublicProfile,
  useCreateReview,
} from '@/src/hooks/use-users';
import { useMyRendezVous } from '@/src/hooks/use-rendez-vous';

// ===== COMPOSANTS =====
import {
  LoadingState,
  EmptyState,
  StatusBadge,
  OpinionBadge,
} from '@/src/components/common';

// ===== SCHEMA & TYPES =====
import { createReviewSchema, type CreateReviewFormValues } from '@/src/schemas/user.schema';
import { RendezvousStatus, Opinion } from '@/src/types/enums';
import type { RendezVousResponse } from '@/src/types/rendez-vous';

// ===== HELPERS =====
import { formatFrenchDate } from '@/src/lib/date-helpers';


export default function AvisConsultantPage() {
  const params = useParams();
  const router = useRouter();
  const consultantId = params.consultantId as string;

  // ===== STATE =====
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRendezVous, setSelectedRendezVous] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===== DATA =====
  const { data: consultant, isLoading: consultantLoading } = useConsultantPublicProfile(consultantId);
  const { data: rendezVous, isLoading: rendezVousLoading } = useMyRendezVous();

  // ===== FORM =====
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateReviewFormValues>({
    resolver: zodResolver(createReviewSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

  // ===== MUTATION =====
  const createReviewMutation = useCreateReview(consultantId);

  // ===== RENDEZ-VOUS ELIGIBLES =====
  const eligibleRendezVous = useMemo(() => {
    if (!rendezVous) return [];
    return rendezVous.filter(
      (r: RendezVousResponse) =>
        r.consultantId === consultantId &&
        r.status === RendezvousStatus.COMPLETED &&
        (!r.opinion || r.opinion === Opinion.PENDING)
    );
  }, [rendezVous, consultantId]);

  // ===== HANDLERS =====
  const onSubmit = async (data: CreateReviewFormValues) => {
    if (!selectedRendezVous) {
      toast.error('Veuillez selectionner un rendez-vous');
      return;
    }

    setIsSubmitting(true);
    try {
      await createReviewMutation.mutateAsync({
        rating: data.rating,
        comment: data.comment,
      });
      toast.success('Votre avis a ete enregistre avec succes');
      setTimeout(() => {
        router.push('/etudiant/mes-rendez-vous');
      }, 2000);
    } catch {
      // Error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (value: number, interactive = false) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => {
              if (interactive) {
                setRating(star);
                setValue('rating', star);
              }
            }}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
            disabled={!interactive}
          >
            {star <= (hoverRating || rating || value) ? (
              <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
            ) : star - 0.5 <= (hoverRating || rating || value) ? (
              <StarHalf className="w-6 h-6 fill-amber-400 text-amber-400" />
            ) : (
              <Star className="w-6 h-6 text-slate-300" />
            )}
          </button>
        ))}
      </div>
    );
  };

  // ===== LOADING =====
  if (consultantLoading || rendezVousLoading) {
    return (
      <section className="w-full bg-white py-12 sm:py-16 lg:py-20 min-h-screen">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <LoadingState message="Chargement des informations..." />
        </div>
      </section>
    );
  }

  // ===== NOT FOUND =====
  if (!consultant) {
    return (
      <section className="w-full bg-white py-12 sm:py-16 lg:py-20 min-h-screen">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <EmptyState
            title="Consultant introuvable"
            description="Le consultant que vous recherchez n'existe pas."
            icon={<User className="w-7 h-7" />}
            action={
              <button
                type="button"
                onClick={() => router.push('/etudiant/mes-rendez-vous')}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour a mes rendez-vous
              </button>
            }
          />
        </div>
      </section>
    );
  }

  // ===== NO ELIGIBLE RENDEZ-VOUS =====
  if (eligibleRendezVous.length === 0) {
    return (
      <section className="w-full bg-white py-12 sm:py-16 lg:py-20 min-h-screen">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <EmptyState
            title="Aucun rendez-vous eligible"
            description="Vous n'avez pas encore de rendez-vous termine avec ce consultant ou vous avez deja donne votre avis."
            icon={<MessageSquare className="w-7 h-7" />}
            action={
              <button
                type="button"
                onClick={() => router.push('/etudiant/mes-rendez-vous')}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour a mes rendez-vous
              </button>
            }
          />
        </div>
      </section>
    );
  }

  const selectedRv = rendezVous?.find((r: RendezVousResponse) => r.id === selectedRendezVous);

  // ===== RENDER =====
  return (
    <section className="w-full bg-white py-8 sm:py-12 min-h-screen">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <button
          type="button"
          onClick={() => router.push('/etudiant/mes-rendez-vous')}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour a mes rendez-vous
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 mb-4">
            <MessageSquare className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-medium tracking-wide text-sky-700">
              Donner un avis
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            Donner votre avis
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Partagez votre experience avec le consultant apres votre entretien.
          </p>
        </div>

        {/* Consultant Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-600 overflow-hidden shrink-0">
              {consultant.photo ? (
                <img src={consultant.photo} alt={consultant.firstName} className="w-full h-full object-cover" />
              ) : (
                `${consultant.firstName?.[0] || ''}${consultant.lastName?.[0] || ''}`
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900">
                {consultant.firstName} {consultant.lastName}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  {consultant.destinations?.length || 0} destinations
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {consultant.stats?.rating || 0} / 5
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {consultant.reviews?.length || 0} avis
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <OpinionBadge opinion={Opinion.FAVORABLE} />
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Select Rendez-vous */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Selectionnez le rendez-vous <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedRendezVous}
              onChange={(e) => setSelectedRendezVous(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-0 focus:border-sky-600 transition-all appearance-none"
            >
              <option value="">Selectionnez un rendez-vous</option>
              {eligibleRendezVous.map((rv: RendezVousResponse) => (
                <option key={rv.id} value={rv.id}>
                  {formatFrenchDate(rv.date)} - {rv.destinationId}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Rendez-vous Details */}
          {selectedRv && (
            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-6 shadow-xs">
              <p className="text-xs font-bold text-sky-700 uppercase tracking-wider mb-3">
                Details du rendez-vous
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-sky-600" />
                  <span>{formatFrenchDate(selectedRv.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="w-4 h-4 text-sky-600" />
                  <span>{selectedRv.firstName} {selectedRv.lastName}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Briefcase className="w-4 h-4 text-sky-600" />
                  <span>{selectedRv.sector}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <span>{selectedRv.destinationId}</span>
                </div>
              </div>
            </div>
          )}

          {/* Rating */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Note <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2">
                {renderStars(0, true)}
              </div>
              <span className="text-sm font-medium text-slate-600">
                {rating > 0 ? `${rating} / 5` : 'Selectionnez une note'}
              </span>
            </div>
            {errors.rating && (
              <p className="text-[11px] text-red-500 flex items-center gap-1 mt-2">
                <AlertCircle className="w-3 h-3" />
                {errors.rating.message}
              </p>
            )}
            <input type="hidden" {...register('rating')} />
          </div>

          {/* Comment */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Commentaire {rating <= 2 && <span className="text-red-500">*</span>}
            </label>
            <textarea
              {...register('comment')}
              rows={5}
              placeholder={
                rating <= 2
                  ? "Veuillez expliquer les raisons de votre evaluation. Votre retour nous aide a ameliorer nos services."
                  : "Partagez votre experience avec ce consultant..."
              }
              className={`w-full p-3.5 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-all resize-none ${
                errors.comment ? 'border-red-300' : 'border-slate-300'
              }`}
            />
            {errors.comment && (
              <p className="text-[11px] text-red-500 flex items-center gap-1 mt-2">
                <AlertCircle className="w-3 h-3" />
                {errors.comment.message}
              </p>
            )}
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Votre commentaire sera visible par le consultant et les autres etudiants.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => router.push('/etudiant/mes-rendez-vous')}
              className="px-5 py-2.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-sm font-medium rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedRendezVous || rating === 0}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer mon avis
                </>
              )}
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            Votre avis est important. Il aide les autres etudiants a faire leur choix et permet aux consultants
            de s'ameliorer. Les avis sont moderes pour garantir leur qualite.
          </p>
        </div>
      </div>
    </section>
  );
}