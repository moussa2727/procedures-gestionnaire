// app/(gestionnaire)/consultant/mes-consultations/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  CalendarDays,
  User,
  FileText,
  Search,
  Eye,
  Loader2,
  MapPin,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  XCircle,
  CalendarClock,
  CheckCircle2,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

// ===== HOOKS =====
import {
  useMyFollowUpMeetingsAsConsultant,
  useCancelFollowUpMeeting,
  useRescheduleFollowUpMeeting,
  useCompleteFollowUpMeeting,
  useFollowUpMeetingRealtime,
} from '@/src/hooks/use-follow-up-meeting';
import { useMyProceduresAsConsultant } from '@/src/hooks/use-procedure';
import { useMyRendezVous } from '@/src/hooks/use-rendez-vous';
import { useConsultantsSemiPublic } from '@/src/hooks/use-users';
import { useDestinations } from '@/src/hooks/use-destinations';

// ===== COMPOSANTS =====
import {
  LoadingState,
  EmptyState,
  StatusBadge,
  SearchInput,
  FilterBar,
  KPIMetrics,
  ConfirmationModal,
  RescheduleModal,
} from '@/src/components/common';

// ===== TYPES =====
import { MeetingStatus, TimeSlot, TIME_SLOT_LABELS } from '@/src/types/enums';
import type { FollowUpMeetingResponse } from '@/src/types/follow-up-meeting';
import type { ProcedureResponse } from '@/src/types/procedure';
import type { RendezVousResponse } from '@/src/types/rendez-vous';

// ===== HELPERS =====
import { formatFrenchDate, formatShortDate } from '@/src/lib/date-helpers';

type StatusFilter = 'ALL' | MeetingStatus;

export default function ConsultantMesConsultationsPage() {
  const router = useRouter();

  // ===== REALTIME =====
  useFollowUpMeetingRealtime();

  // ===== DATA =====
  const { data: meetings, isLoading, refetch } = useMyFollowUpMeetingsAsConsultant();
  const { data: procedures } = useMyProceduresAsConsultant();
  const { data: rendezVous } = useMyRendezVous();
  const { data: consultants } = useConsultantsSemiPublic();
  const { data: destinations } = useDestinations();

  // ===== STATE =====
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ===== MODAL STATE =====
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<FollowUpMeetingResponse | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // ===== MUTATIONS =====
  const cancelMutation = useCancelFollowUpMeeting(selectedMeeting?.id || '');
  const rescheduleMutation = useRescheduleFollowUpMeeting(selectedMeeting?.id || '');
  const completeMutation = useCompleteFollowUpMeeting();

  // ===== HELPERS =====
  const getProcedure = (id: string) => {
    return procedures?.find((p: ProcedureResponse) => p.id === id);
  };

  const getDestinationName = (procedureId: string) => {
    const proc = getProcedure(procedureId);
    if (!proc) return 'Non specifiee';
    const dest = destinations?.find((d: any) => d.id === proc.destinationId);
    return dest?.country || 'Non specifiee';
  };

  const getConsultantName = (consultantId: string) => {
    const consultant = consultants?.find((c: any) => c.id === consultantId);
    return consultant ? `${consultant.firstName} ${consultant.lastName}` : 'Consultant';
  };

  const getStudentName = (meeting: FollowUpMeetingResponse) => {
    const rv = rendezVous?.find((r: RendezVousResponse) => r.id === meeting.studentId);
    if (rv) return `${rv.firstName} ${rv.lastName}`;
    return 'Etudiant';
  };

  const getProcedureNumber = (procedureId: string) => {
    const proc = getProcedure(procedureId);
    return proc?.numeroDossier || 'N/A';
  };

  const getRendezVousDate = (rendezVousId: string) => {
    const rv = rendezVous?.find((r: RendezVousResponse) => r.id === rendezVousId);
    return rv?.date;
  };

  const isActionable = (status: MeetingStatus) => {
    return status === MeetingStatus.CONFIRMED || status === MeetingStatus.PENDING;
  };

  const canComplete = (status: MeetingStatus) => {
    return status === MeetingStatus.CONFIRMED;
  };

  const getStatusLabel = (status: MeetingStatus) => {
    switch (status) {
      case MeetingStatus.CONFIRMED: return 'Confirme';
      case MeetingStatus.PENDING: return 'En attente';
      case MeetingStatus.COMPLETED: return 'Effectue';
      case MeetingStatus.CANCELLED: return 'Annule';
      default: return status;
    }
  };

  // ===== FILTRAGE =====
  const filteredMeetings = useMemo(() => {
    if (!meetings) return [];

    let result = [...meetings];

    if (statusFilter !== 'ALL') {
      result = result.filter((m) => m.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (m) =>
          getProcedureNumber(m.procedureId).toLowerCase().includes(q) ||
          getDestinationName(m.procedureId).toLowerCase().includes(q) ||
          getStudentName(m).toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [meetings, statusFilter, searchTerm, procedures, destinations, consultants, rendezVous]);

  // ===== STATISTIQUES =====
  const stats = useMemo(() => {
    if (!meetings) return { total: 0, confirmed: 0, pending: 0, completed: 0, cancelled: 0 };

    const total = meetings.length;
    const confirmed = meetings.filter((m) => m.status === MeetingStatus.CONFIRMED).length;
    const pending = meetings.filter((m) => m.status === MeetingStatus.PENDING).length;
    const completed = meetings.filter((m) => m.status === MeetingStatus.COMPLETED).length;
    const cancelled = meetings.filter((m) => m.status === MeetingStatus.CANCELLED).length;

    return { total, confirmed, pending, completed, cancelled };
  }, [meetings]);

  // ===== KPIMETRICS =====
  const kpiMetrics = [
    {
      label: 'Total consultations',
      value: stats.total,
      icon: <CalendarDays className="w-3.5 h-3.5" />,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
    },
    {
      label: 'A venir',
      value: stats.confirmed,
      icon: <Calendar className="w-3.5 h-3.5" />,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
    },
    {
      label: 'En attente',
      value: stats.pending,
      icon: <Loader2 className="w-3.5 h-3.5" />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Effectuees',
      value: stats.completed,
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ];

  // ===== FILTER OPTIONS =====
  const filterOptions = [
    { value: 'ALL', label: 'Tous' },
    { value: MeetingStatus.CONFIRMED, label: 'Confirmes' },
    { value: MeetingStatus.PENDING, label: 'En attente' },
    { value: MeetingStatus.COMPLETED, label: 'Effectues' },
    { value: MeetingStatus.CANCELLED, label: 'Annules' },
  ];

  // ===== HANDLERS =====
  const handleCancel = (meeting: FollowUpMeetingResponse) => {
    setSelectedMeeting(meeting);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedMeeting) return;
    await cancelMutation.mutateAsync({ reason: cancelReason || undefined });
    setShowCancelModal(false);
    setSelectedMeeting(null);
    refetch();
  };

  const handleReschedule = (meeting: FollowUpMeetingResponse) => {
    setSelectedMeeting(meeting);
    setShowRescheduleModal(true);
  };

  const handleConfirmReschedule = async (date: string, time: TimeSlot) => {
    if (!selectedMeeting) return;
    await rescheduleMutation.mutateAsync({ date, time });
    setShowRescheduleModal(false);
    setSelectedMeeting(null);
    refetch();
  };

  const handleComplete = (meeting: FollowUpMeetingResponse) => {
    setSelectedMeeting(meeting);
    setShowCompleteModal(true);
  };

  const handleConfirmComplete = async () => {
    if (!selectedMeeting) return;
    await completeMutation.mutateAsync(selectedMeeting.id);
    setShowCompleteModal(false);
    setSelectedMeeting(null);
    refetch();
  };

  // ===== LOADING =====
  if (isLoading) {
    return (
      <section className="w-full bg-white py-12 sm:py-16 lg:py-20 min-h-screen">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <LoadingState message="Chargement de vos consultations..." />
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
            <Briefcase className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-medium tracking-wide text-sky-700">
              Gestion des consultations
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            Mes consultations
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Consultez et gerez vos rendez-vous de suivi de procedure.
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
              placeholder="Rechercher par dossier, destination, etudiant..."
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

        {/* Consultations List */}
        {filteredMeetings.length > 0 ? (
          <div className="space-y-4">
            {filteredMeetings.map((meeting) => {
              const isExpanded = expandedId === meeting.id;
              const destinationName = getDestinationName(meeting.procedureId);
              const studentName = getStudentName(meeting);
              const procedureNumber = getProcedureNumber(meeting.procedureId);
              const actionable = isActionable(meeting.status);
              const completable = canComplete(meeting.status);
              const isCancelled = meeting.status === MeetingStatus.CANCELLED;
              const isCompleted = meeting.status === MeetingStatus.COMPLETED;

              return (
                <div
                  key={meeting.id}
                  className={`bg-white border rounded-2xl p-5 transition-all shadow-xs ${
                    isExpanded ? 'border-sky-300 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Meeting info */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shrink-0">
                        <CalendarDays className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            {studentName} — Dossier #{procedureNumber}
                          </h3>
                          <StatusBadge status={meeting.status} type="meeting" />
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-sky-600" />
                            {formatFrenchDate(meeting.date)} a {TIME_SLOT_LABELS[meeting.time]}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {destinationName}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {studentName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      {!isCancelled && !isCompleted && (
                        <>
                          {completable && (
                            <button
                              type="button"
                              onClick={() => handleComplete(meeting)}
                              disabled={completeMutation.isPending}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Marquer effectue</span>
                            </button>
                          )}

                          {actionable && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleReschedule(meeting)}
                                disabled={rescheduleMutation.isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                              >
                                <CalendarClock className="w-3.5 h-3.5" />
                                Replanifier
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCancel(meeting)}
                                disabled={cancelMutation.isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Annuler
                              </button>
                            </>
                          )}
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => router.push(`/consultant/consultation/${meeting.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-medium rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Voir details
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : meeting.id)}
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
                            Details du rendez-vous
                          </p>
                          <div>
                            <span className="text-slate-500">Date :</span>
                            <span className="ml-2 font-medium text-slate-800">
                              {formatFrenchDate(meeting.date)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Heure :</span>
                            <span className="ml-2 font-medium text-slate-800">
                              {TIME_SLOT_LABELS[meeting.time]}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Statut :</span>
                            <span className="ml-2 font-medium text-slate-800">
                              {getStatusLabel(meeting.status)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Cree par :</span>
                            <span className="ml-2 font-medium text-slate-800">
                              {meeting.createdBy}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                            Details du dossier
                          </p>
                          <div>
                            <span className="text-slate-500">Dossier :</span>
                            <span className="ml-2 font-medium text-slate-800 font-mono">
                              #{procedureNumber}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Etudiant :</span>
                            <span className="ml-2 font-medium text-slate-800">
                              {studentName}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Destination :</span>
                            <span className="ml-2 font-medium text-slate-800">
                              {destinationName}
                            </span>
                          </div>
                          {meeting.reason && (
                            <div>
                              <span className="text-slate-500">Motif :</span>
                              <span className="ml-2 font-medium text-slate-800 italic">
                                {meeting.reason}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {meeting.status === MeetingStatus.CANCELLED && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                          <p className="font-semibold">Consultation annulee</p>
                        </div>
                      )}

                      {meeting.status === MeetingStatus.COMPLETED && (
                        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
                          <p className="font-semibold">Consultation effectuee</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Aucune consultation"
            description="Vous n'avez pas encore de consultation de suivi planifiee."
            icon={<CalendarDays className="w-7 h-7" />}
          />
        )}

        {/* Modals */}

        {/* Cancel Modal */}
        {showCancelModal && selectedMeeting && (
          <ConfirmationModal
            isOpen={true}
            onClose={() => { setShowCancelModal(false); setSelectedMeeting(null); }}
            onConfirm={handleConfirmCancel}
            title="Annuler la consultation"
            subtitle={`Dossier #${getProcedureNumber(selectedMeeting.procedureId)}`}
            variant="danger"
            isPending={cancelMutation.isPending}
            confirmLabel={cancelMutation.isPending ? 'Annulation...' : "Confirmer l'annulation"}
            details={[
              { label: 'Etudiant', value: getStudentName(selectedMeeting) },
              { label: 'Date', value: formatFrenchDate(selectedMeeting.date) },
              { label: 'Horaire', value: TIME_SLOT_LABELS[selectedMeeting.time] },
            ]}
            warningMessage="Cette action est irréversible. Toutes les parties concernées seront notifiées."
          />
        )}

        {/* Reschedule Modal */}
        {showRescheduleModal && selectedMeeting && (
          <RescheduleModal
            isOpen={true}
            onClose={() => { setShowRescheduleModal(false); setSelectedMeeting(null); }}
            onConfirm={handleConfirmReschedule}
            currentDate={selectedMeeting.date}
            currentTime={selectedMeeting.time}
            itemLabel={`Dossier #${getProcedureNumber(selectedMeeting.procedureId)} — ${getStudentName(selectedMeeting)}`}
            variant="consultant"
            isPending={rescheduleMutation.isPending}
            additionalInfo={[
              { label: 'Etudiant', value: getStudentName(selectedMeeting) },
              { label: 'Destination', value: getDestinationName(selectedMeeting.procedureId) },
            ]}
          />
        )}

        {/* Complete Modal */}
        {showCompleteModal && selectedMeeting && (
          <ConfirmationModal
            isOpen={true}
            onClose={() => { setShowCompleteModal(false); setSelectedMeeting(null); }}
            onConfirm={handleConfirmComplete}
            title="Marquer la consultation comme effectuee"
            subtitle={`Dossier #${getProcedureNumber(selectedMeeting.procedureId)}`}
            variant="success"
            isPending={completeMutation.isPending}
            confirmLabel={completeMutation.isPending ? 'Traitement...' : 'Confirmer'}
            details={[
              { label: 'Etudiant', value: getStudentName(selectedMeeting) },
              { label: 'Date', value: formatFrenchDate(selectedMeeting.date) },
              { label: 'Horaire', value: TIME_SLOT_LABELS[selectedMeeting.time] },
            ]}
            warningMessage="Cette action confirme la realisation de la consultation. L'etudiant en sera informe."
          />
        )}
      </div>
    </section>
  );
}