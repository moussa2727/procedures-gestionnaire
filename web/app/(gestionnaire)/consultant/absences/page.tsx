// app/(gestionnaire)/consultant/absences/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Calendar,
  CalendarDays,
  Clock,
  XCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  CalendarX,
  Briefcase,
  Search,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

// ===== HOOKS =====
import {
  useMyUnavailabilities,
  useCreateMyAbsence,
  useRemoveAbsence,
  useConsultantUnavailabilityRealtime,
} from '@/src/hooks/use-consultant-unavailability';

// ===== COMPOSANTS =====
import {
  LoadingState,
  EmptyState,
  ConfirmationModal,
  Modal,
  FilterBar,
  SearchInput,
  KPIMetrics,
} from '@/src/components/common';

// ===== SCHEMA & TYPES =====
import { createUnavailabilitySchema, type CreateUnavailabilityFormValues } from '@/src/schemas/consultant-unavailability.schema';
import { AbsenceType, ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS } from '@/src/types/enums';
import type { UnavailabilityResponse } from '@/src/types/availability';

// ===== HELPERS =====
import { formatFrenchDate, formatDateTime, getTodayStr } from '@/src/lib/date-helpers';

type AbsenceFilter = 'ALL' | 'FUTURE' | 'PAST';

export default function ConsultantAbsencesPage() {
  const router = useRouter();

  // ===== REALTIME =====
  useConsultantUnavailabilityRealtime();

  // ===== DATA =====
  const { data: absences, isLoading, refetch } = useMyUnavailabilities();

  // ===== STATE =====
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<AbsenceFilter>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAbsenceId, setSelectedAbsenceId] = useState<string | null>(null);

  // ===== FORM =====
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUnavailabilityFormValues>({
    resolver: zodResolver(createUnavailabilitySchema),
    defaultValues: {
      startDate: getTodayStr(),
      endDate: getTodayStr(),
      type: AbsenceType.AUTRE,
      reason: '',
    },
  });

  // ===== MUTATIONS =====
  const createMutation = useCreateMyAbsence();
  const removeMutation = useRemoveAbsence();

  // ===== HELPERS =====
  const getTypeLabel = (type: AbsenceType) => {
    return ABSENCE_TYPE_LABELS[type] || type;
  };

  const getTypeColor = (type: AbsenceType) => {
    return ABSENCE_TYPE_COLORS[type] || '#9E9E9E';
  };

  const getStatusBadge = (absence: UnavailabilityResponse) => {
    const now = new Date();
    const startDate = new Date(absence.startDate);
    const endDate = new Date(absence.endDate);

    if (endDate < now) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
          <CheckCircle2 className="w-3 h-3 text-slate-400" />
          Terminee
        </span>
      );
    }
    if (startDate <= now && endDate >= now) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-500" />
          En cours
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
        <Calendar className="w-3 h-3 text-sky-500" />
        A venir
      </span>
    );
  };

  // ===== FILTRAGE =====
  const filteredAbsences = useMemo(() => {
    if (!absences) return [];

    let result = [...absences];

    if (filter === 'FUTURE') {
      const now = new Date();
      result = result.filter((a) => new Date(a.endDate) >= now);
    } else if (filter === 'PAST') {
      const now = new Date();
      result = result.filter((a) => new Date(a.endDate) < now);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (a) =>
          getTypeLabel(a.type).toLowerCase().includes(q) ||
          (a.reason && a.reason.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [absences, filter, searchTerm]);

  // ===== STATISTIQUES =====
  const stats = useMemo(() => {
    if (!absences) return { total: 0, current: 0, future: 0, past: 0 };

    const now = new Date();
    const total = absences.length;
    const current = absences.filter((a) => {
      const start = new Date(a.startDate);
      const end = new Date(a.endDate);
      return start <= now && end >= now;
    }).length;
    const future = absences.filter((a) => new Date(a.startDate) > now).length;
    const past = absences.filter((a) => new Date(a.endDate) < now).length;

    return { total, current, future, past };
  }, [absences]);

  // ===== KPIMETRICS =====
  const kpiMetrics = [
    {
      label: 'Total absences',
      value: stats.total,
      icon: <CalendarDays className="w-3.5 h-3.5" />,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
    },
    {
      label: 'En cours',
      value: stats.current,
      icon: <Clock className="w-3.5 h-3.5" />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'A venir',
      value: stats.future,
      icon: <Calendar className="w-3.5 h-3.5" />,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
    },
    {
      label: 'Terminees',
      value: stats.past,
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ];

  // ===== FILTER OPTIONS =====
  const filterOptions = [
    { value: 'ALL', label: 'Toutes' },
    { value: 'FUTURE', label: 'A venir / En cours' },
    { value: 'PAST', label: 'Terminees' },
  ];

  // ===== HANDLERS =====
  const handleCreate = async (data: CreateUnavailabilityFormValues) => {
    await createMutation.mutateAsync({
      startDate: data.startDate,
      endDate: data.endDate,
      type: data.type,
      reason: data.reason,
    });
    setShowCreateModal(false);
    reset();
    refetch();
  };

  const handleDelete = (id: string) => {
    setSelectedAbsenceId(id);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedAbsenceId) return;
    await removeMutation.mutateAsync(selectedAbsenceId);
    setShowDeleteModal(false);
    setSelectedAbsenceId(null);
    refetch();
  };

  // ===== LOADING =====
  if (isLoading) {
    return (
      <section className="w-full bg-white py-12 sm:py-16 lg:py-20 min-h-screen">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <LoadingState message="Chargement de vos absences..." />
        </div>
      </section>
    );
  }

  // ===== RENDER =====
  return (
    <section className="w-full bg-white py-8 sm:py-12 min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 mb-4">
            <CalendarDays className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-medium tracking-wide text-sky-700">Gestion des indisponibilites</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            Mes absences
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Declarez et gerez vos indisponibilites pour les rendez-vous de consultation.
          </p>
        </div>

        {/* KPIMetrics */}
        <KPIMetrics metrics={kpiMetrics} className="mb-6" />

        {/* Actions & Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Rechercher par type, motif..."
                className="flex-1"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => refetch()}
                className="p-2.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-colors shadow-2xs"
                title="Actualiser"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Declarer une absence</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <FilterBar
              filters={filterOptions}
              activeFilter={filter}
              onFilterChange={(v) => setFilter(v as AbsenceFilter)}
              label="Filtrer :"
            />
          </div>
        </div>

        {/* Absences List */}
        {filteredAbsences.length > 0 ? (
          <div className="space-y-3">
            {filteredAbsences.map((absence) => {
              const isExpanded = expandedId === absence.id;
              const startDate = new Date(absence.startDate);
              const endDate = new Date(absence.endDate);
              const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              const typeColor = getTypeColor(absence.type);

              return (
                <div
                  key={absence.id}
                  className={`bg-white border rounded-2xl p-5 transition-all shadow-xs ${
                    isExpanded ? 'border-sky-300 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Absence info */}
                    <div className="flex items-start gap-3.5">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${typeColor}20`, borderColor: typeColor }}
                      >
                        <CalendarX className="w-5 h-5" style={{ color: typeColor }} />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            {getTypeLabel(absence.type)}
                          </h3>
                          {getStatusBadge(absence)}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatFrenchDate(absence.startDate)} - {formatFrenchDate(absence.endDate)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {durationDays} jour{durationDays > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      {new Date(absence.startDate) > new Date() && (
                        <button
                          type="button"
                          onClick={() => handleDelete(absence.id)}
                          disabled={removeMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Supprimer</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : absence.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Apercu rapide"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded: Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="space-y-1.5">
                          <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                            Details de l'absence
                          </p>
                          <div>
                            <span className="text-slate-500">Type :</span>
                            <span className="ml-2 font-medium text-slate-800">
                              {getTypeLabel(absence.type)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Date de debut :</span>
                            <span className="ml-2 font-medium text-slate-800">
                              {formatFrenchDate(absence.startDate)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Date de fin :</span>
                            <span className="ml-2 font-medium text-slate-800">
                              {formatFrenchDate(absence.endDate)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Duree :</span>
                            <span className="ml-2 font-medium text-slate-800">
                              {durationDays} jour{durationDays > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                            Autres informations
                          </p>
                          {absence.reason && (
                            <div>
                              <span className="text-slate-500">Motif :</span>
                              <span className="ml-2 font-medium text-slate-800 italic">
                                {absence.reason}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-500">Cree le :</span>
                            <span className="ml-2 font-medium text-slate-800">
                              {formatDateTime(absence.createdAt)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Statut :</span>
                            <span className="ml-2 font-medium text-slate-800">
                              {new Date(absence.endDate) < new Date()
                                ? 'Terminee'
                                : new Date(absence.startDate) <= new Date()
                                ? 'En cours'
                                : 'A venir'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Aucune absence declaree"
            description="Vous n'avez pas encore declare d'indisponibilite."
            icon={<CalendarDays className="w-7 h-7" />}
            action={
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Declarer une absence
              </button>
            }
          />
        )}

        {/* Create Absence Modal */}
        {showCreateModal && (
          <Modal
            isOpen={true}
            onClose={() => { setShowCreateModal(false); reset(); }}
            title="Declarer une absence"
            subtitle="Renseignez la periode et le type d'indisponibilite"
            maxWidth="lg"
            footer={
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); reset(); }}
                  className="px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSubmit(handleCreate)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                      Enregistrement...
                    </>
                  ) : (
                    'Enregistrer'
                  )}
                </button>
              </div>
            }
          >
            <form className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Date de debut <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      {...register('startDate')}
                      type="date"
                      min={getTodayStr()}
                      className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 focus:outline-none focus:border-sky-600 transition-all ${
                        errors.startDate ? 'border-red-300' : 'border-slate-300'
                      }`}
                    />
                  </div>
                  {errors.startDate && (
                    <p className="text-[11px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.startDate.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Date de fin <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      {...register('endDate')}
                      type="date"
                      min={getTodayStr()}
                      className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 focus:outline-none focus:border-sky-600 transition-all ${
                        errors.endDate ? 'border-red-300' : 'border-slate-300'
                      }`}
                    />
                  </div>
                  {errors.endDate && (
                    <p className="text-[11px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.endDate.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Type d'absence <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('type')}
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 focus:outline-none focus:border-sky-600 transition-all appearance-none ${
                    errors.type ? 'border-red-300' : 'border-slate-300'
                  }`}
                >
                  {Object.entries(ABSENCE_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.type && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.type.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Motif (optionnel)
                </label>
                <textarea
                  {...register('reason')}
                  rows={2}
                  placeholder="Precisez le motif de votre absence..."
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 resize-none"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Les absences declarees bloquent automatiquement les creneaux correspondants
                  pour les rendez-vous de suivi.
                </p>
              </div>
            </form>
          </Modal>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <ConfirmationModal
            isOpen={true}
            onClose={() => { setShowDeleteModal(false); setSelectedAbsenceId(null); }}
            onConfirm={handleConfirmDelete}
            title="Supprimer l'absence"
            subtitle="Cette action est irréversible"
            variant="danger"
            isPending={removeMutation.isPending}
            confirmLabel={removeMutation.isPending ? 'Suppression...' : 'Confirmer la suppression'}
            details={[
              { label: 'Action', value: 'Suppression d\'indisponibilite' },
            ]}
            warningMessage="Cette action est irréversible. Les creneaux correspondants seront a nouveau disponibles."
          />
        )}
      </div>
    </section>
  );
}