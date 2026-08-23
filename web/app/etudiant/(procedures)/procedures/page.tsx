// app/etudiant/procedures/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Eye,
  Loader2,
  FolderOpen,
  MapPin,
  User,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Calendar,
} from 'lucide-react';

// ===== HOOKS =====
import { useDestinations } from '@/src/hooks/use-destinations';
import { useMyRendezVous } from '@/src/hooks/use-rendez-vous';
import { useConsultantsSemiPublic } from '@/src/hooks/use-users';

// ===== COMPOSANTS =====
import {
  LoadingState,
  EmptyState,
  StatusBadge,
  SearchInput,
  FilterBar,
  KPIMetrics,
} from '@/src/components/common';

// ===== TYPES =====
import { ProcedureStatus, StepStatus } from '@/src/types/enums';
import type { StepResponse } from '@/src/types/procedure';
import type { DestinationResponse } from '@/src/types/destination';

// ===== HELPERS =====
import { formatShortDate } from '@/src/lib/date-helpers';
import { useMyProcedures } from '@/src/hooks/use-procedure';



type StatusFilter = 'ALL' | ProcedureStatus;

export default function EtudiantProceduresPage() {
  const router = useRouter();

  // ===== DATA =====
  const { data: procedures, isLoading, refetch } = useMyProcedures();
  const { data: destinations } = useDestinations();
  const { data: rendezVous } = useMyRendezVous();
  const { data: consultants } = useConsultantsSemiPublic();

  // ===== STATE =====
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ===== HELPERS =====
  const getDestinationName = (id: string) => {
    const dest = destinations?.find((d: DestinationResponse) => d.id === id);
    return dest?.country || 'Non specifiee';
  };

  const getConsultantName = (id: string) => {
    const consultant = consultants?.find((c: any) => c.id === id);
    return consultant ? `${consultant.firstName} ${consultant.lastName}` : 'Consultant';
  };

  const getStepStatusLabel = (status: StepStatus) => {
    switch (status) {
      case StepStatus.PENDING: return 'En attente';
      case StepStatus.IN_PROGRESS: return 'En cours';
      case StepStatus.COMPLETED: return 'Validee';
      case StepStatus.REJECTED: return 'Rejetee';
      default: return status;
    }
  };

  const getStepStatusColor = (status: StepStatus) => {
    switch (status) {
      case StepStatus.PENDING: return 'bg-amber-50 border-amber-200 text-amber-700';
      case StepStatus.IN_PROGRESS: return 'bg-sky-50 border-sky-200 text-sky-700';
      case StepStatus.COMPLETED: return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case StepStatus.REJECTED: return 'bg-red-50 border-red-200 text-red-700';
      default: return 'bg-slate-50 border-slate-200 text-slate-600';
    }
  };

  const getStepStatusIcon = (status: StepStatus) => {
    switch (status) {
      case StepStatus.COMPLETED: return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case StepStatus.REJECTED: return <XCircle className="w-3.5 h-3.5 text-red-600" />;
      case StepStatus.IN_PROGRESS: return <Loader2 className="w-3.5 h-3.5 text-sky-600 animate-spin" />;
      default: return <Clock className="w-3.5 h-3.5 text-amber-600" />;
    }
  };

  // ===== FILTRAGE =====
  const filteredProcedures = useMemo(() => {
    if (!procedures) return [];

    let result = [...procedures];

    if (statusFilter !== 'ALL') {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.numeroDossier.toLowerCase().includes(q) ||
          getDestinationName(p.destinationId).toLowerCase().includes(q) ||
          getConsultantName(p.consultantId).toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [procedures, statusFilter, searchTerm, destinations, consultants]);

  // ===== STATISTIQUES =====
  const stats = useMemo(() => {
    if (!procedures) return { total: 0, inProgress: 0, completed: 0, rejected: 0, cancelled: 0 };

    const total = procedures.length;
    const inProgress = procedures.filter((p) => p.status === ProcedureStatus.IN_PROGRESS).length;
    const completed = procedures.filter((p) => p.status === ProcedureStatus.COMPLETED).length;
    const rejected = procedures.filter((p) => p.status === ProcedureStatus.REJECTED).length;
    const cancelled = procedures.filter((p) => p.status === ProcedureStatus.CANCELLED).length;

    return { total, inProgress, completed, rejected, cancelled };
  }, [procedures]);

  // ===== KPIMETRICS =====
  const kpiMetrics = [
    {
      label: 'Total dossiers',
      value: stats.total,
      icon: <FolderOpen className="w-3.5 h-3.5" />,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
    },
    {
      label: 'En cours',
      value: stats.inProgress,
      icon: <Loader2 className="w-3.5 h-3.5" />,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
    },
    {
      label: 'Terminees',
      value: stats.completed,
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Rejetees',
      value: stats.rejected,
      icon: <XCircle className="w-3.5 h-3.5" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  // ===== FILTER OPTIONS =====
  const filterOptions = [
    { value: 'ALL', label: 'Tous' },
    { value: ProcedureStatus.IN_PROGRESS, label: 'En cours' },
    { value: ProcedureStatus.COMPLETED, label: 'Terminees' },
    { value: ProcedureStatus.REJECTED, label: 'Rejetees' },
    { value: ProcedureStatus.CANCELLED, label: 'Annulees' },
  ];

  // ===== LOADING =====
  if (isLoading) {
    return (
      <section className="w-full bg-white py-12 sm:py-16 lg:py-20 min-h-screen">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <LoadingState message="Chargement de vos procedures..." />
        </div>
      </section>
    );
  }

  // ===== RENDER =====
  return (
    <section className="w-full bg-white py-12 sm:py-16 lg:py-20 min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 mb-4">
            <FileText className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-medium tracking-wide text-sky-700">
              Mes procedures
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            Mes procedures
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Suivez l'avancement de vos procedures d'orientation et de mobilite internationale.
          </p>
        </div>

        {/* KPIMetrics */}
        <KPIMetrics metrics={kpiMetrics} className="mb-6" />

        {/* Filters & Search */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Rechercher par numero de dossier, destination, consultant..."
              className="flex-1"
            />

            <button
              type="button"
              onClick={() => refetch()}
              className="p-2.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-colors shadow-2xs shrink-0"
              title="Actualiser"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <FilterBar
              filters={filterOptions}
              activeFilter={statusFilter}
              onFilterChange={(v) => setStatusFilter(v as StatusFilter)}
              label="Statut :"
            />
          </div>
        </div>

        {/* Procedures List */}
        {filteredProcedures.length > 0 ? (
          <div className="space-y-4">
            {filteredProcedures.map((procedure) => {
              const isExpanded = expandedId === procedure.id;
              const destinationName = getDestinationName(procedure.destinationId);
              const consultantName = getConsultantName(procedure.consultantId);
              const completedSteps = procedure.steps?.filter((s) => s.status === StepStatus.COMPLETED).length || 0;
              const totalSteps = procedure.steps?.length || 0;
              const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

              return (
                <div
                  key={procedure.id}
                  className={`bg-white border rounded-2xl p-5 transition-all shadow-xs ${
                    isExpanded ? 'border-sky-300 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Dossier info */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm shrink-0">
                        <FileText className="w-5 h-5 text-slate-500" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 font-mono">
                            {procedure.numeroDossier}
                          </h3>
                          <StatusBadge status={procedure.status} type="procedure" />
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {destinationName}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {consultantName}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatShortDate(procedure.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Progress & Actions */}
                    <div className="flex flex-wrap items-center gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      {/* Progress */}
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              procedure.status === ProcedureStatus.COMPLETED
                                ? 'bg-emerald-500'
                                : procedure.status === ProcedureStatus.REJECTED
                                ? 'bg-red-500'
                                : 'bg-sky-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">
                          {progress}%
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => router.push(`/etudiant/procedure/${procedure.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-medium rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Voir details
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : procedure.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Apercu rapide"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded: Quick steps preview */}
                  {isExpanded && procedure.steps && procedure.steps.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {procedure.steps.slice(0, 6).map((step: StepResponse) => (
                          <div
                            key={step.id}
                            className={`p-3 rounded-xl border text-xs ${getStepStatusColor(step.status)}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold truncate">{step.stepName}</span>
                              <span className="flex items-center gap-1">
                                {getStepStatusIcon(step.status)}
                                <span className="text-[10px]">{getStepStatusLabel(step.status)}</span>
                              </span>
                            </div>
                            {step.rejectionReason && (
                              <p className="text-[10px] text-red-600 mt-1 truncate">
                                Motif: {step.rejectionReason}
                              </p>
                            )}
                          </div>
                        ))}
                        {procedure.steps.length > 6 && (
                          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-500">
                            +{procedure.steps.length - 6} autres etapes
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Aucune procedure"
            description="Vous n'avez pas encore de procedure en cours. Une procedure est creee automatiquement apres votre premier rendez-vous."
            icon={<FileText className="w-7 h-7" />}
            action={
              <button
                type="button"
                onClick={() => router.push('/etudiant/prendre-rendez-vous')}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4" />
                Prendre un rendez-vous
              </button>
            }
          />
        )}
      </div>
    </section>
  );
}