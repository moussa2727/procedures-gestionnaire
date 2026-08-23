// app/etudiant/planifier-consultation/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Calendar,
  Clock,
  User,
  FileText,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  CalendarCheck2,
  Info,
  Loader2,
  CheckCircle2,
  XCircle,
  MapPin,
  Briefcase,
} from 'lucide-react';

// ===== HOOKS =====
import { useMyProcedures } from '@/src/hooks/use-procedure';
import { useMyRendezVous } from '@/src/hooks/use-rendez-vous';
import { useCreateFollowUpMeeting } from '@/src/hooks/use-follow-up-meeting';
import { useAvailableSlots } from '@/src/hooks/use-availability';
import { useConsultantsSemiPublic } from '@/src/hooks/use-users';
import { useDestinations } from '@/src/hooks/use-destinations';

// ===== COMPOSANTS =====
import { LoadingState, Modal, ConfirmationModal } from '@/src/components/common';

// ===== SCHEMA & TYPES =====
import { createFollowUpMeetingSchema, type CreateFollowUpMeetingFormValues } from '@/src/schemas/follow-up-meeting.schema';
import { TimeSlot, TIME_SLOT_LABELS, ProcedureStatus } from '@/src/types/enums';
import type { FollowUpMeetingResponse } from '@/src/types/follow-up-meeting';
import type { ProcedureResponse } from '@/src/types/procedure';
import type { RendezVousResponse } from '@/src/types/rendez-vous';

// ===== HELPERS =====
import { formatFrenchDate, getTodayStr } from '@/src/lib/date-helpers';
import React from 'react';


type Step = 1 | 2 | 3;

export default function PlanifierConsultationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState<FollowUpMeetingResponse | null>(null);

  // ===== DATA =====
  const { data: procedures, isLoading: proceduresLoading } = useMyProcedures();
  const { data: rendezVous, isLoading: rendezVousLoading } = useMyRendezVous();
  const { data: consultants } = useConsultantsSemiPublic();
  const { data: destinations } = useDestinations();

  // ===== FORM =====
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<CreateFollowUpMeetingFormValues>({
    resolver: zodResolver(createFollowUpMeetingSchema),
    mode: 'onChange',
    defaultValues: {
      procedureId: '',
      date: '',
      time: undefined,
      reason: '',
    },
  });

  // ===== WATCHED FIELDS =====
  const watchedProcedureId = watch('procedureId');
  const watchedDate = watch('date');
  const watchedTime = watch('time');

  // ===== PROCEDURES ELIGIBLES =====
  const eligibleProcedures = useMemo(() => {
    if (!procedures) return [];
    return procedures.filter(
      (p) => p.status === ProcedureStatus.IN_PROGRESS
    );
  }, [procedures]);

  // ===== PROCEDURE SELECTIONNEE =====
  const selectedProcedure = useMemo(() => {
    if (!procedures || !watchedProcedureId) return null;
    return procedures.find((p) => p.id === watchedProcedureId) || null;
  }, [procedures, watchedProcedureId]);

  // ===== INFOS PROCEDURE =====
  const procedureInfo = useMemo(() => {
    if (!selectedProcedure) return null;

    const rv = rendezVous?.find((r: RendezVousResponse) => r.id === selectedProcedure.rendezVousId);
    const consultant = consultants?.find((c: any) => c.id === selectedProcedure.consultantId);
    const destination = destinations?.find((d: any) => d.id === selectedProcedure.destinationId);

    return {
      consultantName: consultant ? `${consultant.firstName} ${consultant.lastName}` : 'Consultant',
      destinationName: destination?.country || 'Non specifiee',
      rendezVousDate: rv?.date,
      rendezVousTime: rv?.time,
    };
  }, [selectedProcedure, rendezVous, consultants, destinations]);

  // ===== CRENEAUX DISPONIBLES =====
  const todayStr = useMemo(getTodayStr, []);
  const { data: availableSlotsRaw, isLoading: slotsLoading } = useAvailableSlots(
    selectedProcedure?.destinationId || '',
    watchedDate || '',
    selectedProcedure?.consultantId || undefined
  );

  const availableSlots = useMemo<TimeSlot[]>(() => {
    if (Array.isArray(availableSlotsRaw) && availableSlotsRaw.length > 0) return availableSlotsRaw;
    if (availableSlotsRaw && Array.isArray((availableSlotsRaw as any).data) && (availableSlotsRaw as any).data.length > 0) {
      return (availableSlotsRaw as any).data;
    }
    return [];
  }, [availableSlotsRaw]);

  // ===== SLOT EXPIRATION =====
  const isSlotExpired = useMemo(() => {
    if (!watchedDate || !watchedTime) return false;
    const now = new Date();
    const slotDate = new Date(watchedDate);
    const [hours, minutes] = TIME_SLOT_LABELS[watchedTime].replace('h', '').split('h').map(Number);
    slotDate.setHours(hours || 0, minutes || 0, 0, 0);
    return slotDate < now;
  }, [watchedDate, watchedTime]);

  // ===== MUTATION =====
  const createMutation = useCreateFollowUpMeeting();

  // ===== NAVIGATION =====
  const handleNextStep1 = async () => {
    const isValidStep = await trigger(['procedureId']);
    if (isValidStep) setCurrentStep(2);
  };

  const handleNextStep2 = async () => {
    const isValidStep = await trigger(['date', 'time']);
    if (isValidStep) setCurrentStep(3);
  };

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as Step);
  };

  // ===== SUBMISSION =====
  const onSubmit = async () => setShowConfirmModal(true);

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    try {
      const values = watch() as CreateFollowUpMeetingFormValues;
      const result = await createMutation.mutateAsync(values);
      setCreatedMeeting(result);
      setShowSuccess(true);
      setTimeout(() => {
        router.push('/etudiant/mes-consultations');
      }, 3000);
    } catch {
      // Error handled by hook
    }
  };

  // ===== STEP VALIDATION =====
  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 1: return !!watchedProcedureId;
      case 2: return !!(watchedDate && watchedTime && !isSlotExpired);
      case 3: return true;
      default: return false;
    }
  }, [currentStep, watchedProcedureId, watchedDate, watchedTime, isSlotExpired]);

  // ===== LOADING =====
  if (proceduresLoading || rendezVousLoading) {
    return (
      <section className="w-full bg-white py-12 sm:py-16 lg:py-20 min-h-screen">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <LoadingState message="Chargement de vos procedures..." />
        </div>
      </section>
    );
  }

  // ===== SUCCESS MODAL =====
  if (showSuccess && createdMeeting) {
    return (
      <Modal
        isOpen={true}
        onClose={() => router.push('/etudiant/mes-consultations')}
        title="Consultation planifiee"
        subtitle="Votre rendez-vous de suivi a ete cree avec succes"
        maxWidth="lg"
        showCloseButton={true}
        footer={
          <button
            type="button"
            onClick={() => router.push('/etudiant/mes-consultations')}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-all"
          >
            Voir mes consultations
          </button>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
            <p className="font-semibold">Votre consultation est planifiee !</p>
            <p className="text-xs mt-1">Un email de confirmation vous a ete envoye.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 block">Date & Heure</span>
              <p className="font-semibold text-slate-900">
                {formatFrenchDate(createdMeeting.date)} a {TIME_SLOT_LABELS[createdMeeting.time]}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 block">Reference</span>
              <p className="font-semibold text-slate-900 font-mono text-xs">
                #{createdMeeting.id.slice(0, 8)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
            <span>Redirection vers mes consultations...</span>
          </div>
        </div>
      </Modal>
    );
  }

  // ===== CONFIRMATION MODAL =====
  if (showConfirmModal) {
    const values = watch();
    const procedure = selectedProcedure;
    const consultant = procedureInfo;

    return (
      <ConfirmationModal
        isOpen={true}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        title="Confirmation de la consultation"
        subtitle={`Dossier #${procedure?.numeroDossier || ''}`}
        variant="primary"
        isPending={isSubmitting}
        confirmLabel={isSubmitting ? 'Confirmation...' : 'Confirmer la consultation'}
        details={[
          { label: 'Dossier', value: `#${procedure?.numeroDossier || ''}` },
          { label: 'Destination', value: consultant?.destinationName || '—' },
          { label: 'Consultant', value: consultant?.consultantName || '—' },
          { label: 'Date', value: values.date ? formatFrenchDate(values.date) : '—' },
          { label: 'Horaire', value: values.time ? TIME_SLOT_LABELS[values.time] : '—' },
        ]}
        infoMessage="Vous recevrez un email de confirmation avec tous les details de votre consultation."
      />
    );
  }

  // ===== RENDER =====
  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 mb-4">
          <Briefcase className="w-4 h-4 text-sky-600" />
          <span className="text-xs font-medium tracking-wide text-sky-700">
            Planifier une consultation
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <CalendarCheck2 className="w-7 h-7 text-sky-600" />
          Planifier une consultation
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Planifiez un rendez-vous de suivi pour avancer votre procedure d'orientation en 3 etapes
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((step) => (
            <React.Fragment key={step}>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${
                  step <= currentStep ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div className={`flex-1 h-0.5 transition-all ${step < currentStep ? 'bg-sky-600' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-400 font-medium">
          <span>Dossier</span>
          <span>Date & Horaire</span>
          <span>Recapitulatif</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step Header */}
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg">Etape {currentStep}</span>
          <h2 className="text-base font-bold text-slate-800">
            {['Dossier', 'Date & Horaire', 'Recapitulatif'][currentStep - 1]}
          </h2>
        </div>

        {/* STEP 1: Procedure */}
        {currentStep === 1 && (
          <Step1Procedure
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
            eligibleProcedures={eligibleProcedures}
            selectedProcedure={selectedProcedure}
            procedureInfo={procedureInfo}
          />
        )}

        {/* STEP 2: Date & Time */}
        {currentStep === 2 && (
          <Step2DateTime
            register={register}
            errors={errors}
            setValue={setValue}
            watch={watch}
            availableSlots={availableSlots}
            slotsLoading={slotsLoading}
            todayStr={todayStr}
            isSlotExpired={isSlotExpired}
            selectedProcedure={selectedProcedure}
            procedureInfo={procedureInfo}
          />
        )}

        {/* STEP 3: Summary */}
        {currentStep === 3 && (
          <Step3Summary
            watch={watch}
            selectedProcedure={selectedProcedure}
            procedureInfo={procedureInfo}
          />
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handlePrevStep}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              currentStep === 1 ? 'text-slate-400 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'
            }`}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4" />
            Precedent
          </button>

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={() => {
                switch (currentStep) {
                  case 1: handleNextStep1(); break;
                  case 2: handleNextStep2(); break;
                }
              }}
              disabled={!canGoNext}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
            >
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canGoNext || isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirmation...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirmer la consultation
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ===== STEP 1: PROCEDURE =====
function Step1Procedure({
  register,
  errors,
  watch,
  setValue,
  eligibleProcedures,
  selectedProcedure,
  procedureInfo,
}: {
  register: any;
  errors: any;
  watch: any;
  setValue: any;
  eligibleProcedures: ProcedureResponse[];
  selectedProcedure: ProcedureResponse | null;
  procedureInfo: any;
}) {
  const procedureId = watch('procedureId');

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-sky-50 border border-sky-200 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-sky-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-sky-800">
            Selectionnez le dossier pour lequel vous souhaitez planifier une consultation
          </p>
          <p className="text-[11px] text-sky-600 mt-0.5">
            Seuls les dossiers en cours de traitement sont eligibles
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Dossier <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            {...register('procedureId')}
            onChange={(e) => {
              setValue('procedureId', e.target.value);
              register('procedureId').onChange(e);
            }}
            className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 focus:outline-none focus:border-sky-600 transition-all appearance-none ${
              errors.procedureId ? 'border-red-300' : 'border-slate-300'
            }`}
          >
            <option value="">Selectionnez un dossier</option>
            {eligibleProcedures.map((p) => (
              <option key={p.id} value={p.id}>
                {p.numeroDossier}
              </option>
            ))}
          </select>
        </div>
        {errors.procedureId && (
          <p className="text-[11px] text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.procedureId.message}
          </p>
        )}
        {eligibleProcedures.length === 0 && (
          <p className="text-[11px] text-amber-600 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Aucun dossier en cours de traitement
          </p>
        )}
      </div>

      {/* Apercu du dossier */}
      {selectedProcedure && procedureInfo && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <p className="font-bold text-slate-700">Details du dossier</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-slate-400">Numero :</span>
              <span className="ml-2 font-semibold text-slate-900">{selectedProcedure.numeroDossier}</span>
            </div>
            <div>
              <span className="text-slate-400">Destination :</span>
              <span className="ml-2 font-semibold text-slate-900 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-600" />
                {procedureInfo.destinationName}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Consultant :</span>
              <span className="ml-2 font-semibold text-slate-900 flex items-center gap-1">
                <User className="w-3 h-3 text-sky-600" />
                {procedureInfo.consultantName}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Etapes :</span>
              <span className="ml-2 font-semibold text-slate-900">
                {selectedProcedure.steps?.filter((s) => s.status === 'COMPLETED').length || 0}/
                {selectedProcedure.steps?.length || 0} validees
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== STEP 2: DATE & TIME =====
function Step2DateTime({
  register,
  errors,
  setValue,
  watch,
  availableSlots,
  slotsLoading,
  todayStr,
  isSlotExpired,
  selectedProcedure,
  procedureInfo,
}: {
  register: any;
  errors: any;
  setValue: any;
  watch: any;
  availableSlots: TimeSlot[];
  slotsLoading: boolean;
  todayStr: string;
  isSlotExpired: boolean;
  selectedProcedure: ProcedureResponse | null;
  procedureInfo: any;
}) {
  const date = watch('date');
  const time = watch('time');

  return (
    <div className="space-y-6">
      {/* Infos procedure */}
      {selectedProcedure && procedureInfo && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">
              Dossier #{selectedProcedure.numeroDossier}
            </span>
            <span className="text-slate-500">
              {procedureInfo.destinationName}
            </span>
          </div>
        </div>
      )}

      {/* Date */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Date <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            {...register('date')}
            type="date"
            min={todayStr}
            className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 focus:outline-none focus:border-sky-600 transition-all ${
              errors.date ? 'border-red-300' : 'border-slate-300'
            }`}
          />
        </div>
        {errors.date && (
          <p className="text-[11px] text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.date.message}
          </p>
        )}
      </div>

      {/* Creneaux */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Horaire <span className="text-red-500">*</span>
        </label>

        {!date ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <p className="text-xs text-slate-500">Selectionnez d'abord une date</p>
          </div>
        ) : slotsLoading ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
            <span className="ml-2 text-xs text-slate-500">Chargement des creneaux...</span>
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-xs text-amber-700">
              <Info className="w-4 h-4 inline mr-1" />
              Aucun creneau disponible pour cette date
            </p>
            <p className="text-[11px] text-amber-600 mt-1">Essayez une autre date</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1">
            {availableSlots.map((slot) => {
              const isSelected = time === slot;
              const isExpired = (() => {
                if (!date || !slot) return false;
                const now = new Date();
                const slotDate = new Date(date);
                const [hours, minutes] = TIME_SLOT_LABELS[slot].replace('h', '').split('h').map(Number);
                slotDate.setHours(hours || 0, minutes || 0, 0, 0);
                return slotDate < now;
              })();

              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => {
                    if (!isExpired) setValue('time', slot);
                  }}
                  disabled={isExpired}
                  className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                    isSelected
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : isExpired
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300 hover:bg-sky-50'
                  }`}
                >
                  {TIME_SLOT_LABELS[slot]}
                  {isExpired && (
                    <span className="block text-[9px] text-slate-400">depasse</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {errors.time && (
          <p className="text-[11px] text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.time.message}
          </p>
        )}

        {date && time && isSlotExpired && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Ce creneau horaire est deja passe. Veuillez en selectionner un autre.</p>
          </div>
        )}
      </div>

      {/* Motif (optionnel) */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Motif (optionnel)
        </label>
        <textarea
          {...register('reason')}
          rows={2}
          placeholder="Precisez l'objet de cette consultation de suivi..."
          className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 resize-none"
        />
      </div>
    </div>
  );
}

// ===== STEP 3: SUMMARY =====
function Step3Summary({
  watch,
  selectedProcedure,
  procedureInfo,
}: {
  watch: any;
  selectedProcedure: ProcedureResponse | null;
  procedureInfo: any;
}) {
  const values = watch();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const completedSteps = selectedProcedure?.steps?.filter((s) => s.status === 'COMPLETED').length || 0;
  const totalSteps = selectedProcedure?.steps?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        <p className="text-xs text-emerald-800 font-medium">
          Verifiez toutes les informations avant de confirmer votre consultation
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
        <div className="space-y-2">
          <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
            Dossier
          </p>
          <div>
            <span className="text-slate-400">Numero</span>
            <p className="font-semibold text-slate-900 font-mono">
              {selectedProcedure?.numeroDossier || '—'}
            </p>
          </div>
          <div>
            <span className="text-slate-400">Destination</span>
            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-600" />
              {procedureInfo?.destinationName || '—'}
            </p>
          </div>
          <div>
            <span className="text-slate-400">Consultant</span>
            <p className="font-semibold text-slate-900">
              {procedureInfo?.consultantName || '—'}
            </p>
          </div>
          <div>
            <span className="text-slate-400">Progression</span>
            <p className="font-semibold text-slate-900">
              {completedSteps}/{totalSteps} etapes validees
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
            Details de la consultation
          </p>
          <div>
            <span className="text-slate-400">Date</span>
            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              {values.date ? formatDate(values.date) : '—'}
            </p>
          </div>
          <div>
            <span className="text-slate-400">Horaire</span>
            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              {values.time ? TIME_SLOT_LABELS[values.time as TimeSlot] : '—'}
            </p>
          </div>
          {values.reason && (
            <div>
              <span className="text-slate-400">Motif</span>
              <p className="font-semibold text-slate-900 text-[11px] mt-0.5 italic">
                {values.reason}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800 flex items-start gap-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Un email de confirmation vous sera envoye apres validation.
          Vous pourrez gerer vos consultations depuis votre espace.
        </p>
      </div>
    </div>
  );
}