// app/etudiant/prendre-rendez-vous/page.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarCheck2, ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react';

import { useMyProfile } from '@/src/hooks/use-users';
import { useDestinations } from '@/src/hooks/use-destinations';
import { useConsultantsByDestination } from '@/src/hooks/use-consultant-destination';
import { useAvailableSlots } from '@/src/hooks/use-availability';
import { useCreateRendezVous } from '@/src/hooks/use-rendez-vous';

import { LoadingState, Modal, ConfirmationModal } from '@/src/components/common';
import { Step1Profile, Step2DestinationConsultant, Step3DateTime, Step4Summary } from '@/src/components/etudiant/rendez-vous/booking';

import { createRendezVousSchema, type CreateRendezVousFormValues } from '@/src/schemas/rendez-vous.schema';
import { TimeSlot, TIME_SLOT_LABELS } from '@/src/types/enums';
import type { RendezVousResponse } from '@/src/types/rendez-vous';
import type { DestinationResponse } from '@/src/types/destination';

import { formatFrenchDate, getTodayStr } from '@/src/lib/date-helpers';

type Step = 1 | 2 | 3 | 4;

export default function PrendreRendezVousPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [createdRendezVous, setCreatedRendezVous] = useState<RendezVousResponse | null>(null);

  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const { data: destinationsRaw, isLoading: destLoading } = useDestinations();

  const destinations = useMemo<DestinationResponse[]>(() => {
    if (Array.isArray(destinationsRaw)) return destinationsRaw;
    if (destinationsRaw && Array.isArray((destinationsRaw as any).data)) return (destinationsRaw as any).data;
    return [];
  }, [destinationsRaw]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<CreateRendezVousFormValues>({
    resolver: zodResolver(createRendezVousSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      sector: '',
      studyLevel: '',
      destinationId: '',
      consultantId: '',
      date: '',
      time: undefined,
    },
  });

  const watched = watch();
  const { destinationId, consultantId, date, time } = watched;

  useEffect(() => {
    if (profile && !profileLoading) {
      const p = profile as any;
      if (p.firstName && !watch('firstName')) setValue('firstName', p.firstName);
      if (p.lastName && !watch('lastName')) setValue('lastName', p.lastName);
      if (p.email && !watch('email')) setValue('email', p.email);
      if (p.phone && !watch('phone')) setValue('phone', p.phone || '');
    }
  }, [profile, profileLoading, setValue, watch]);

  const { data: consultantsRaw, isLoading: consultantsLoading } = useConsultantsByDestination(destinationId || '');
  const consultants = useMemo(() => {
    if (Array.isArray(consultantsRaw)) return consultantsRaw;
    if (consultantsRaw && Array.isArray((consultantsRaw as any).data)) return (consultantsRaw as any).data;
    return [];
  }, [consultantsRaw]);

  const todayStr = useMemo(getTodayStr, []);
  const { data: availableSlotsRaw, isLoading: slotsLoading } = useAvailableSlots(
    destinationId || '',
    date || '',
    consultantId || undefined
  );

  const availableSlots = useMemo<TimeSlot[]>(() => {
    if (Array.isArray(availableSlotsRaw) && availableSlotsRaw.length > 0) return availableSlotsRaw;
    if (availableSlotsRaw && Array.isArray((availableSlotsRaw as any).data) && (availableSlotsRaw as any).data.length > 0) {
      return (availableSlotsRaw as any).data;
    }
    return [];
  }, [availableSlotsRaw]);

  const createMutation = useCreateRendezVous();

  const isSlotExpired = useMemo(() => {
    if (!date || !time) return false;
    const now = new Date();
    const slotDate = new Date(date);
    const [hours, minutes] = TIME_SLOT_LABELS[time].replace('h', '').split('h').map(Number);
    slotDate.setHours(hours || 0, minutes || 0, 0, 0);
    return slotDate < now;
  }, [date, time]);

  const handleNextStep1 = async () => {
    const fields = ['firstName', 'lastName', 'email', 'phone', 'sector', 'studyLevel'] as const;
    if (await trigger(fields)) setCurrentStep(2);
  };

  const handleNextStep2 = async () => {
    if (await trigger(['destinationId', 'consultantId'])) setCurrentStep(3);
  };

  const handleNextStep3 = async () => {
    if (await trigger(['date', 'time'])) setCurrentStep(4);
  };

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as Step);
  };

  const onSubmit = async () => setShowConfirmModal(true);

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    try {
      const result = await createMutation.mutateAsync(watched as CreateRendezVousFormValues);
      setCreatedRendezVous(result);
      setShowSuccess(true);
      setTimeout(() => router.push('/etudiant/mes-rendez-vous'), 3000);
    } catch {
      // Error handled by hook toast
    }
  };

  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 1:
        return !!(
          watched.firstName &&
          watched.lastName &&
          watched.email &&
          watched.phone &&
          watched.sector &&
          watched.studyLevel
        );
      case 2:
        return !!(watched.destinationId && watched.consultantId);
      case 3:
        return !!(watched.date && watched.time && !isSlotExpired);
      case 4:
        return true;
      default:
        return false;
    }
  }, [currentStep, watched, isSlotExpired]);

  if (profileLoading || destLoading) {
    return <LoadingState message="Chargement de vos informations..." />;
  }

  if (showSuccess && createdRendezVous) {
    return (
      <Modal
        isOpen={true}
        onClose={() => router.push('/etudiant/mes-rendez-vous')}
        title="Rendez-vous confirme"
        subtitle="Votre entretien a ete planifie avec succes"
        maxWidth="lg"
        showCloseButton={true}
        footer={
          <button
            type="button"
            onClick={() => router.push('/etudiant/mes-rendez-vous')}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-all"
          >
            Voir mes rendez-vous
          </button>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
            <p className="font-semibold">Votre rendez-vous est confirme !</p>
            <p className="text-xs mt-1">Un email de confirmation vous a ete envoye.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 block">Date & Heure</span>
              <p className="font-semibold text-slate-900">
                {formatFrenchDate(createdRendezVous.date)} a {TIME_SLOT_LABELS[createdRendezVous.time]}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 block">Reference</span>
              <p className="font-semibold text-slate-900 font-mono text-xs">#{createdRendezVous.id.slice(0, 8)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
            <span>Redirection vers mes rendez-vous...</span>
          </div>
        </div>
      </Modal>
    );
  }

  if (showConfirmModal) {
    const destination = destinations.find((d) => d.id === watched.destinationId);
    const consultant = consultants.find((c: any) => c.id === watched.consultantId);

    return (
      <ConfirmationModal
        isOpen={true}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        title="Confirmation du rendez-vous"
        subtitle={`Entretien — ${destination?.country || ''}`}
        variant="primary"
        isPending={isSubmitting}
        confirmLabel={isSubmitting ? 'Confirmation...' : 'Confirmer le rendez-vous'}
        details={[
          { label: 'Candidat', value: `${watched.firstName} ${watched.lastName}` },
          { label: 'Destination', value: destination?.country || '—' },
          { label: 'Consultant', value: consultant ? `${consultant.firstName} ${consultant.lastName}` : '—' },
          { label: 'Date', value: watched.date ? formatFrenchDate(watched.date) : '—' },
          { label: 'Horaire', value: watched.time ? TIME_SLOT_LABELS[watched.time] : '—' },
        ]}
        infoMessage="Vous recevrez un email de confirmation avec tous les details de votre entretien."
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <CalendarCheck2 className="w-7 h-7 text-sky-600" />
          Prendre un rendez-vous
        </h1>
        <p className="text-sm text-slate-500 mt-1">Reservez votre entretien d'orientation en 4 etapes</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((step) => (
            <React.Fragment key={step}>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${
                  step <= currentStep ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step}
              </div>
              {step < 4 && (
                <div className={`flex-1 h-0.5 transition-all ${step < currentStep ? 'bg-sky-600' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-400 font-medium">
          <span>Identite</span>
          <span>Destination</span>
          <span>Date & Horaire</span>
          <span>Recapitulatif</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg">Etape {currentStep}</span>
          <h2 className="text-base font-bold text-slate-800">
            {['Identite', 'Destination & Consultant', 'Date & Horaire', 'Recapitulatif'][currentStep - 1]}
          </h2>
        </div>

        {currentStep === 1 && <Step1Profile errors={errors} />}
        {currentStep === 2 && (
          <Step2DestinationConsultant
            destinations={destinations}
            consultants={consultants}
            consultantsLoading={consultantsLoading}
          />
        )}
        {currentStep === 3 && (
          <Step3DateTime
            availableSlots={availableSlots}
            slotsLoading={slotsLoading}
            todayStr={todayStr}
            isSlotExpired={isSlotExpired}
          />
        )}
        {currentStep === 4 && (
          <Step4Summary destinations={destinations} consultants={consultants} />
        )}

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

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => {
                switch (currentStep) {
                  case 1: handleNextStep1(); break;
                  case 2: handleNextStep2(); break;
                  case 3: handleNextStep3(); break;
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
                  Confirmer le rendez-vous
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
