// components/admin/availability/AdminAvailabilityCreateModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Calendar,
  Clock,
  User,
  AlertCircle,
  Info,
  Check,
} from 'lucide-react';
import { Modal } from '@/src/components/common';
import {
  createUnavailabilitySchema,
  type CreateUnavailabilityFormValues,
} from '@/src/schemas/consultant-unavailability.schema';
import { AbsenceType, ABSENCE_TYPE_LABELS } from '@/src/types/enums';
import type { ConsultantSemiPublicProfile } from '@/src/types/user';

interface AdminAvailabilityCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultants: ConsultantSemiPublicProfile[];
  onCreate: (values: CreateUnavailabilityFormValues & { consultantId: string }) => Promise<void>;
  isPending?: boolean;
}

export function AdminAvailabilityCreateModal({
  isOpen,
  onClose,
  consultants,
  onCreate,
  isPending = false,
}: AdminAvailabilityCreateModalProps) {
  const [selectedConsultantId, setSelectedConsultantId] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isValid },
  } = useForm<CreateUnavailabilityFormValues>({
    resolver: zodResolver(createUnavailabilitySchema),
    mode: 'onChange',
    defaultValues: {
      startDate: '',
      endDate: '',
      type: AbsenceType.AUTRE,
      reason: '',
    },
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');

  // Réinitialiser le formulaire à l'ouverture
  useEffect(() => {
    if (isOpen) {
      reset({
        startDate: '',
        endDate: '',
        type: AbsenceType.AUTRE,
        reason: '',
      });
      setSelectedConsultantId('');
    }
  }, [isOpen, reset]);

  const onSubmit = async (values: CreateUnavailabilityFormValues) => {
    if (!selectedConsultantId) {
      // Ne devrait pas arriver car le select est requis
      return;
    }
    await onCreate({
      ...values,
      consultantId: selectedConsultantId,
    });
    reset();
    setSelectedConsultantId('');
    onClose();
  };

  const handleClose = () => {
    reset();
    setSelectedConsultantId('');
    onClose();
  };

  const isMultiDay = startDate && endDate && startDate !== endDate;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nouvelle indisponibilité"
      subtitle="Déclarer une période d'indisponibilité pour un consultant"
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={!isValid || !selectedConsultantId || isPending}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            {isPending ? 'Création...' : 'Créer l\'indisponibilité'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Sélection du consultant */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Consultant <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedConsultantId}
              onChange={(e) => setSelectedConsultantId(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 hover:border-sky-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-sky-600 transition-colors"
            >
              <option value="">Sélectionner un consultant...</option>
              {consultants.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} ({c.photo})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Type d'absence */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Type d'absence <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <AlertCircle className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              {...register('type')}
              className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 hover:border-sky-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-sky-600 transition-colors"
            >
              {Object.values(AbsenceType).map((type) => (
                <option key={type} value={type}>
                  {ABSENCE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          {errors.type && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.type.message}
            </p>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Date de début <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                {...register('startDate')}
                className={`w-full pl-10 pr-3.5 py-2.5 bg-white border ${
                  errors.startDate ? 'border-red-500' : 'border-slate-300 hover:border-sky-300'
                } rounded-xl text-sm text-slate-900 focus:outline-none focus:border-sky-600 transition-colors`}
              />
            </div>
            {errors.startDate && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
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
                type="date"
                {...register('endDate')}
                className={`w-full pl-10 pr-3.5 py-2.5 bg-white border ${
                  errors.endDate ? 'border-red-500' : 'border-slate-300 hover:border-sky-300'
                } rounded-xl text-sm text-slate-900 focus:outline-none focus:border-sky-600 transition-colors`}
              />
            </div>
            {errors.endDate && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.endDate.message}
              </p>
            )}
          </div>
        </div>

        {/* Indicateur multi-jours */}
        {isMultiDay && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Cette indisponibilité s'étend sur plusieurs jours.</p>
          </div>
        )}

        {/* Motif (optionnel) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Motif (optionnel)
          </label>
          <textarea
            rows={3}
            placeholder="Précisez le motif de l'indisponibilité..."
            {...register('reason')}
            className="w-full p-3 bg-white border border-slate-300 hover:border-sky-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors resize-none"
          />
          {errors.reason && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.reason.message}
            </p>
          )}
        </div>

        {/* Aide */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
          <p>Les créneaux concernés seront automatiquement bloqués dans l'agenda du consultant.</p>
        </div>
      </div>
    </Modal>
  );
}