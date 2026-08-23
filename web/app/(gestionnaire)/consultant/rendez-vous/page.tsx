// app/(gestionnaire)/consultant/rendez-vous/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Briefcase, Calendar, UserCheck, RefreshCw, CheckCircle2, XCircle, Search, Send, ThumbsUp, ThumbsDown, Clock } from 'lucide-react';

import {
  useMyRendezVousAsConsultant,
  useCompleteRendezVous,
  useRendezVousRealtime,
  rendezVousKeys,
} from '@/src/hooks/use-rendez-vous';
import { rendezVousService } from '@/src/services/rendez-vous.service';
import { extractErrorMessage } from '@/src/lib/api-client';
import { useDestinations } from '@/src/hooks/use-destinations';
import { useConsultantsSemiPublic } from '@/src/hooks/use-users';

import {
  LoadingState,
  EmptyState,
  StatusBadge,
  OpinionBadge,
  FilterBar,
  SearchInput,
  KPIMetrics,
  Modal,
  ConfirmationModal,
  RescheduleModal,
} from '@/src/components/common';

import { RendezVousAgenda } from '@/src/components/common/rendez-vous';
import { ConsultantAppointmentCard, ConsultantRendezVousFilters } from '@/src/components/consultant/rendez-vous';

import {
  RendezvousStatus,
  Opinion,
  TimeSlot,
  TIME_SLOT_LABELS,
} from '@/src/types/enums';
import type {
  RendezVousResponse,
  SetOpinionPayload,
  RescheduleRendezVousPayload,
  CancelRendezVousPayload,
} from '@/src/types/rendez-vous';

import { formatFrenchDate, formatShortDate } from '@/src/lib/date-helpers';

type StatusFilter = 'ALL' | RendezvousStatus;
type OpinionFilter = 'ALL' | Opinion | 'NO_OPINION';
type ViewMode = 'list' | 'agenda';

export default function ConsultantRendezVousPage() {
  useRendezVousRealtime();

  const { data: allAppointments = [], isLoading, refetch } = useMyRendezVousAsConsultant();
  const { data: destinations = [] } = useDestinations();
  const { data: consultants = [] } = useConsultantsSemiPublic();

  const qc = useQueryClient();

  const completeMutation = useCompleteRendezVous();

  const setOpinionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SetOpinionPayload }) =>
      rendezVousService.setOpinion(id, payload),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: rendezVousKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: rendezVousKeys.all });
      toast.success('Avis enregistre');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RescheduleRendezVousPayload }) =>
      rendezVousService.reschedule(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rendezVousKeys.all });
      toast.success('Rendez-vous replanifie');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CancelRendezVousPayload }) =>
      rendezVousService.cancel(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rendezVousKeys.all });
      toast.success('Rendez-vous annule');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });

  const [selectedConsultantId, setSelectedConsultantId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [opinionFilter, setOpinionFilter] = useState<OpinionFilter>('ALL');
  const [selectedDestinationFilter, setSelectedDestinationFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [agendaDate, setAgendaDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [opinionModalRv, setOpinionModalRv] = useState<RendezVousResponse | null>(null);
  const [opinionChoice, setOpinionChoice] = useState<Opinion>(Opinion.FAVORABLE);
  const [opinionNotes, setOpinionNotes] = useState<string>('');

  const [rescheduleModalRv, setRescheduleModalRv] = useState<RendezVousResponse | null>(null);
  const [newDate, setNewDate] = useState<string>('');
  const [newTime, setNewTime] = useState<TimeSlot>(TimeSlot.SLOT_1000);

  const [cancelModalRv, setCancelModalRv] = useState<RendezVousResponse | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    type: 'cancel' | 'complete' | 'reschedule' | 'unfavorable_opinion';
    title: string;
    subtitle: string;
    rendezVous: RendezVousResponse;
    details: { label: string; value: string }[];
    warningMessage?: string;
    confirmLabel: string;
    confirmVariant: 'danger' | 'success' | 'primary' | 'warning';
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const getDestinationName = (destId?: string) => {
    if (!destId) return 'Destination internationale';
    const found = destinations.find((d: { id: string }) => d.id === destId);
    return found ? found.country : destId;
  };

  const getConsultantName = (cId?: string) => {
    if (!cId) return 'Consultant assigne';
    const found = consultants.find((c: { id: string }) => c.id === cId);
    return found ? `${found.firstName} ${found.lastName}` : 'Consultant assigne';
  };

  const filteredAppointments = useMemo(() => {
    let result = [...allAppointments];

    if (selectedConsultantId !== 'all') {
      result = result.filter((r) => r.consultantId === selectedConsultantId);
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((r) => r.status === statusFilter);
    }

    if (opinionFilter === 'NO_OPINION') {
      result = result.filter((r) => !r.opinion || r.opinion === Opinion.PENDING);
    } else if (opinionFilter !== 'ALL') {
      result = result.filter((r) => r.opinion === opinionFilter);
    }

    if (selectedDestinationFilter !== 'ALL') {
      result = result.filter((r) => r.destinationId === selectedDestinationFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.firstName.toLowerCase().includes(q) ||
          r.lastName.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q) ||
          r.sector.toLowerCase().includes(q) ||
          r.studyLevel.toLowerCase().includes(q) ||
          getDestinationName(r.destinationId).toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [
    allAppointments,
    selectedConsultantId,
    statusFilter,
    opinionFilter,
    selectedDestinationFilter,
    searchTerm,
  ]);

  const stats = useMemo(() => {
    const relevant =
      selectedConsultantId === 'all'
        ? allAppointments
        : allAppointments.filter((r: { consultantId: string }) => r.consultantId === selectedConsultantId);

    const total = relevant.length;
    const confirmed = relevant.filter((r: { status: RendezvousStatus }) => r.status === RendezvousStatus.CONFIRMED).length;
    const completed = relevant.filter((r: { status: RendezvousStatus }) => r.status === RendezvousStatus.COMPLETED).length;
    const cancelled = relevant.filter((r: { status: RendezvousStatus }) => r.status === RendezvousStatus.CANCELLED).length;
    const favorable = relevant.filter((r) => r.opinion === Opinion.FAVORABLE).length;
    const unfavorable = relevant.filter((r) => r.opinion === Opinion.UNFAVORABLE).length;
    const pendingOpinion = relevant.filter(
      (r) =>
        r.status === RendezvousStatus.COMPLETED && (!r.opinion || r.opinion === Opinion.PENDING)
    ).length;

    return { total, confirmed, completed, cancelled, favorable, unfavorable, pendingOpinion };
  }, [allAppointments, selectedConsultantId]);

  const agendaSlots = useMemo(() => {
    const slotsMap: Record<TimeSlot, RendezVousResponse | null> = {
      [TimeSlot.SLOT_0900]: null,
      [TimeSlot.SLOT_0930]: null,
      [TimeSlot.SLOT_1000]: null,
      [TimeSlot.SLOT_1030]: null,
      [TimeSlot.SLOT_1100]: null,
      [TimeSlot.SLOT_1130]: null,
      [TimeSlot.SLOT_1400]: null,
      [TimeSlot.SLOT_1430]: null,
      [TimeSlot.SLOT_1500]: null,
      [TimeSlot.SLOT_1530]: null,
      [TimeSlot.SLOT_1600]: null,
      [TimeSlot.SLOT_1630]: null,
    };

    const dayRendezVous = filteredAppointments.filter((r) => r.date === agendaDate);
    dayRendezVous.forEach((r) => {
      if (slotsMap[r.time as TimeSlot] !== undefined) {
        slotsMap[r.time as TimeSlot] = r;
      }
    });

    return slotsMap;
  }, [filteredAppointments, agendaDate]);

  const handleComplete = (rv: RendezVousResponse) => {
    setConfirmConfig({
      isOpen: true,
      type: 'complete',
      title: "Validation de la Seance d'Entretien",
      subtitle: 'Confirmer la realisation effective de cette consultation d\'orientation.',
      rendezVous: rv,
      details: [
        { label: 'Candidat', value: `${rv.firstName} ${rv.lastName}` },
        { label: 'Date & Heure', value: `${formatFrenchDate(rv.date)} a ${TIME_SLOT_LABELS[rv.time] || rv.time}` },
        { label: 'Destination visee', value: getDestinationName(rv.destinationId) },
        { label: 'Filiere / Domaine', value: rv.sector || 'Mobilite academique' },
      ],
      warningMessage:
        "Le statut passera a 'Effectue / Termine' et la grille d'avis academique s'ouvrira immediatement pour formaliser vos preconisations pedagogiques.",
      confirmLabel: 'Valider et ouvrir la deliberation',
      confirmVariant: 'success',
      onConfirm: async () => {
        await completeMutation.mutateAsync(rv.id);
        setConfirmConfig(null);
        setOpinionModalRv(rv);
        setOpinionChoice(rv.opinion || Opinion.FAVORABLE);
        setOpinionNotes((rv as any).opinionNotes || (rv as any).notes || '');
      },
    });
  };

  const handleSaveOpinion = async () => {
    if (!opinionModalRv) return;
    const rv = opinionModalRv;

    if (opinionChoice === Opinion.UNFAVORABLE) {
      setConfirmConfig({
        isOpen: true,
        type: 'unfavorable_opinion',
        title: "Confirmation d'Avis Defavorable",
        subtitle: "Decision pedagogique officielle a impact critique sur la procedure.",
        rendezVous: rv,
        details: [
          { label: 'Candidat', value: `${rv.firstName} ${rv.lastName}` },
          { label: 'Decision officielle', value: 'Avis Defavorable' },
          { label: 'Destination', value: getDestinationName(rv.destinationId) },
        ],
        warningMessage:
          "Cet avis sera consigne de facon officielle dans le dossier d'orientation.",
        confirmLabel: "Confirmer l'Avis Defavorable",
        confirmVariant: 'warning',
        onConfirm: async () => {
          await setOpinionMutation.mutateAsync({
            id: rv.id,
            payload: { opinion: opinionChoice },
          });
          setConfirmConfig(null);
          setOpinionModalRv(null);
        },
      });
      return;
    }

    try {
      await setOpinionMutation.mutateAsync({
        id: rv.id,
        payload: { opinion: opinionChoice },
      });
      setOpinionModalRv(null);
    } catch {
      // Error handled by hook
    }
  };

  const handleReschedule = (rv: RendezVousResponse) => {
    setRescheduleModalRv(rv);
    setNewDate(rv.date);
    setNewTime(rv.time);
  };

  const handleConfirmReschedule = async (date: string, time: TimeSlot) => {
    if (!rescheduleModalRv) return;
    await rescheduleMutation.mutateAsync({
      id: rescheduleModalRv.id,
      payload: { date, time },
    });
    setRescheduleModalRv(null);
  };

  const handleCancel = (rv: RendezVousResponse) => {
    setCancelModalRv(rv);
    setCancelReason('');
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalRv) return;
    await cancelMutation.mutateAsync({
      id: cancelModalRv.id,
      payload: { reason: cancelReason || undefined },
    });
    setCancelModalRv(null);
  };

  const kpiMetrics = [
    { label: 'Total Dossiers', value: stats.total, icon: <Briefcase className="w-3.5 h-3.5" />, color: 'text-slate-600', bgColor: 'bg-slate-50' },
    { label: 'A Venir', value: stats.confirmed, icon: <Calendar className="w-3.5 h-3.5" />, color: 'text-sky-600', bgColor: 'bg-sky-50' },
    { label: 'Realises', value: stats.completed, icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { label: 'Avis Favorables', value: stats.favorable, icon: <span className="text-emerald-700">👍</span>, color: 'text-emerald-700', bgColor: 'bg-emerald-50/30' },
    { label: 'Avis en Attente', value: stats.pendingOpinion, icon: <Clock className="w-3.5 h-3.5" />, color: 'text-amber-700', bgColor: 'bg-amber-50/50' },
    { label: 'Annules', value: stats.cancelled, icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-red-700', bgColor: 'bg-red-50/40' },
  ];

  if (isLoading) {
    return (
      <section className="w-full bg-slate-50 py-8 sm:py-12 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <LoadingState message="Chargement de vos rendez-vous..." />
        </div>
      </section>
    );
  }

  const selectedConsultant = consultants.find((c: { id: string }) => c.id === selectedConsultantId);

  return (
    <section className="w-full bg-slate-50 py-8 sm:py-12 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                  <Briefcase className="w-3.5 h-3.5 text-sky-600" />
                  Espace Consultant
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">Gestion des Entretiens d'Orientation</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Pilotage & Traitement des Rendez-Vous
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
                Consultez vos sessions d'orientation, validez la tenue des entretiens, emettez vos avis academiques detailles et gerez les replanifications en temps reel.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {selectedConsultant ? (
                    `${selectedConsultant.firstName?.[0] || ''}${selectedConsultant.lastName?.[0] || ''}`
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <label htmlFor="consultant-select-filter" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Consultant Actif
                  </label>
                  <select
                    id="consultant-select-filter"
                    value={selectedConsultantId}
                    onChange={(e) => setSelectedConsultantId(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-4"
                  >
                    <option value="all">Tous les consultants ({allAppointments.length} RDV)</option>
                    {consultants.map((c: { id: string; firstName: string; lastName: string }) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => refetch()}
                className="p-2.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-colors shadow-2xs"
                title="Actualiser les rendez-vous"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
              </button>
            </div>
          </div>

          <KPIMetrics metrics={kpiMetrics} className="mt-6 pt-6 border-t border-slate-100" />
        </div>

        <ConsultantRendezVousFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          opinionFilter={opinionFilter}
          onOpinionFilterChange={setOpinionFilter}
          selectedDestinationFilter={selectedDestinationFilter}
          onDestinationFilterChange={setSelectedDestinationFilter}
          destinations={destinations}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {viewMode === 'list' && (
          <div className="space-y-3">
            {filteredAppointments.length > 0 ? (
              filteredAppointments.map((rv) => (
                <ConsultantAppointmentCard
                  key={rv.id}
                  rendezVous={rv}
                  getDestinationName={getDestinationName}
                  getConsultantName={getConsultantName}
                  isExpanded={expandedId === rv.id}
                  onToggleExpand={() => setExpandedId(expandedId === rv.id ? null : rv.id)}
                  onComplete={() => handleComplete(rv)}
                  onReschedule={() => handleReschedule(rv)}
                  onCancel={() => handleCancel(rv)}
                  onOpinion={() => {
                    setOpinionModalRv(rv);
                    setOpinionChoice(rv.opinion || Opinion.FAVORABLE);
                    setOpinionNotes((rv as any).opinionNotes || (rv as any).notes || '');
                  }}
                  isPending={completeMutation.isPending || rescheduleMutation.isPending || cancelMutation.isPending}
                />
              ))
            ) : (
              <EmptyState
                title="Aucun rendez-vous trouve"
                description="Aucun entretien ne correspond aux filtres appliques ou au consultant selectionne."
                icon={<Search className="w-7 h-7" />}
                action={
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('ALL');
                      setOpinionFilter('ALL');
                      setSelectedDestinationFilter('ALL');
                    }}
                    className="mt-4 px-4 py-2 bg-white border border-slate-300 hover:border-sky-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Reinitialiser tous les filtres
                  </button>
                }
              />
            )}
          </div>
        )}

        {viewMode === 'agenda' && (
          <RendezVousAgenda
            agendaSlots={agendaSlots}
            agendaDate={agendaDate}
            onDateChange={setAgendaDate}
            getDestinationName={getDestinationName}
            onComplete={handleComplete}
            onOpinion={(appt) => {
              setOpinionModalRv(appt);
              setOpinionChoice(appt.opinion || Opinion.FAVORABLE);
              setOpinionNotes((appt as any).opinionNotes || (appt as any).notes || '');
            }}
            isConsultant={true}
          />
        )}
      </div>

      {opinionModalRv && (
        <Modal
          isOpen={true}
          onClose={() => setOpinionModalRv(null)}
          title="Avis d'Orientation Academique"
          subtitle={`${opinionModalRv.firstName} ${opinionModalRv.lastName}`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpinionModalRv(null)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveOpinion}
                disabled={setOpinionMutation.isPending}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enregistrer l'Avis</span>
              </button>
            </div>
          }
        >
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="font-semibold text-slate-900">
              Candidat : {opinionModalRv.firstName} {opinionModalRv.lastName}
            </div>
            <div className="text-slate-500">
              Filiere : {opinionModalRv.sector} ({opinionModalRv.studyLevel}) • Destination :{' '}
              {getDestinationName(opinionModalRv.destinationId)}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Decision d'Orientation
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setOpinionChoice(Opinion.FAVORABLE)}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  opinionChoice === Opinion.FAVORABLE
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                <ThumbsUp className="w-4 h-4 text-emerald-600" />
                <span className="text-xs">Favorable</span>
              </button>

              <button
                type="button"
                onClick={() => setOpinionChoice(Opinion.PENDING)}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  opinionChoice === Opinion.PENDING
                    ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-xs">A Completer</span>
              </button>

              <button
                type="button"
                onClick={() => setOpinionChoice(Opinion.UNFAVORABLE)}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  opinionChoice === Opinion.UNFAVORABLE
                    ? 'bg-red-50 border-red-500 text-red-900 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                <ThumbsDown className="w-4 h-4 text-red-600" />
                <span className="text-xs">Defavorable</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="opinion-notes-textarea" className="block text-xs font-bold text-slate-700">
              Preconisations & Notes Detaillees
            </label>
            <textarea
              id="opinion-notes-textarea"
              rows={4}
              value={opinionNotes}
              onChange={(e) => setOpinionNotes(e.target.value)}
              placeholder="Ex: Dossier recevable. Prerequis linguistique valide (IELTS 7.0). Universites cibles recommandees : McGill et Concordia."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-0 focus:border-sky-600 focus:bg-white transition-colors resize-none"
            />
          </div>
        </Modal>
      )}

      {rescheduleModalRv && (
        <RescheduleModal
          isOpen={true}
          onClose={() => setRescheduleModalRv(null)}
          onConfirm={handleConfirmReschedule}
          currentDate={rescheduleModalRv.date}
          currentTime={rescheduleModalRv.time}
          itemLabel={`${rescheduleModalRv.firstName} ${rescheduleModalRv.lastName}`}
          variant="consultant"
          isPending={rescheduleMutation.isPending}
          additionalInfo={[
            { label: 'Destination', value: getDestinationName(rescheduleModalRv.destinationId) },
            { label: 'Filiere', value: rescheduleModalRv.sector },
          ]}
        />
      )}

      {cancelModalRv && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setCancelModalRv(null)}
          onConfirm={handleConfirmCancel}
          title="Annuler le rendez-vous"
          subtitle={`${cancelModalRv.firstName} ${cancelModalRv.lastName} — ${getDestinationName(cancelModalRv.destinationId)}`}
          variant="danger"
          isPending={cancelMutation.isPending}
          confirmLabel={cancelMutation.isPending ? 'Annulation...' : "Confirmer l'annulation"}
          details={[
            { label: 'Date', value: formatFrenchDate(cancelModalRv.date) },
            { label: 'Horaire', value: TIME_SLOT_LABELS[cancelModalRv.time] },
            { label: 'Destination', value: getDestinationName(cancelModalRv.destinationId) },
          ]}
          warningMessage="Cette action est irreversible. Le creneau sera libere et le candidat sera notifie."
        />
      )}

      {confirmConfig && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setConfirmConfig(null)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          subtitle={confirmConfig.subtitle}
          variant={confirmConfig.confirmVariant}
          isPending={
            completeMutation.isPending ||
            cancelMutation.isPending ||
            rescheduleMutation.isPending ||
            setOpinionMutation.isPending
          }
          confirmLabel={confirmConfig.confirmLabel}
          details={confirmConfig.details}
          warningMessage={confirmConfig.warningMessage}
        />
      )}
    </section>
  );
}
