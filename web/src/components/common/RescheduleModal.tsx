// components/common/RescheduleModal.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Info } from 'lucide-react';
import { TimeSlot, TIME_SLOT_LABELS } from '@/src/types/enums';
import { Modal } from './Modal';
import { ConfirmationModal } from './ConfirmationModal';
import { RescheduleModalForm } from './RescheduleModalForm';

export interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string, time: TimeSlot) => Promise<void>;
  currentDate: string;
  currentTime: TimeSlot;
  itemLabel: string;
  additionalInfo?: { label: string; value: string }[];
  title?: string;
  subtitle?: string;
  variant?: 'student' | 'consultant' | 'admin';
  availableSlots?: TimeSlot[];
  isPending?: boolean;
}

const config = {
  student: {
    iconBg: 'bg-sky-50 border-sky-200 text-sky-600',
    buttonBg: 'bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400',
    confirmVariant: 'primary' as const,
    defaultTitle: 'Replanifier mon rendez-vous',
    defaultSubtitle: 'Sélectionnez une nouvelle date',
    defaultInfo: 'Votre conseiller recevra automatiquement la mise à jour.',
    defaultWarning: "L'ancien créneau sera libéré et le nouvel horaire réservé.",
  },
  consultant: {
    iconBg: 'bg-sky-50 border-sky-200 text-sky-600',
    buttonBg: 'bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400',
    confirmVariant: 'primary' as const,
    defaultTitle: 'Replanifier l\'entretien',
    defaultSubtitle: 'Modifier la date et le créneau',
    defaultInfo: "L'ancien créneau sera libéré et le nouvel horaire réservé.",
    defaultWarning: "L'ancien créneau sera immédiatement libéré et le nouvel horaire sera réservé.",
  },
  admin: {
    iconBg: 'bg-amber-50 border-amber-200 text-amber-600',
    buttonBg: 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400',
    confirmVariant: 'warning' as const,
    defaultTitle: 'Replanifier administrativement',
    defaultSubtitle: 'Modification par l\'administration',
    defaultInfo: 'Le consultant et le candidat seront notifiés de ce changement.',
    defaultWarning: 'Cette modification est effectuée par l\'administration.',
  },
};

export function RescheduleModal({
  isOpen,
  onClose,
  onConfirm,
  currentDate,
  currentTime,
  itemLabel,
  additionalInfo = [],
  title,
  subtitle,
  variant = 'consultant',
  availableSlots: externalSlots,
  isPending = false,
}: RescheduleModalProps) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [newDate, setNewDate] = useState<string>(currentDate);
  const [newTime, setNewTime] = useState<TimeSlot>(currentTime);

  useEffect(() => {
    if (isOpen) {
      setNewDate(currentDate);
      setNewTime(currentTime);
    }
  }, [isOpen, currentDate, currentTime]);

  const availableSlots = useMemo(() => {
    if (externalSlots && externalSlots.length > 0) return externalSlots;
    return Object.values(TimeSlot);
  }, [externalSlots]);

  const cfg = config[variant] || config.consultant;

  const formatFriendlyDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const handleOpenConfirmation = () => setShowConfirmation(true);

  const handleConfirm = async () => {
    await onConfirm(newDate, newTime);
    setShowConfirmation(false);
    onClose();
  };

  const confirmationDetails = [
    { label: 'Élément', value: itemLabel },
    {
      label: 'Créneau initial',
      value: `${formatFriendlyDate(currentDate)} à ${TIME_SLOT_LABELS[currentTime] || currentTime}`,
    },
    {
      label: 'Nouveau créneau',
      value: `${formatFriendlyDate(newDate)} à ${TIME_SLOT_LABELS[newTime] || newTime}`,
    },
    ...additionalInfo,
  ];

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen && !showConfirmation}
        onClose={onClose}
        title={title || cfg.defaultTitle}
        subtitle={subtitle || cfg.defaultSubtitle}
        maxWidth="md"
        showCloseButton={true}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleOpenConfirmation}
              disabled={isPending || !newDate || !newTime}
              className={`px-4 py-2 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 ${cfg.buttonBg}`}
            >
              <span>Continuer</span>
            </button>
          </div>
        }
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${cfg.iconBg}`}
          >
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title || cfg.defaultTitle}</h3>
            <p className="text-xs text-slate-500">{itemLabel}</p>
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
          <p>
            <span className="font-semibold text-slate-500">Créneau actuel :</span>{' '}
            <span className="line-through text-slate-500">
              {formatFriendlyDate(currentDate)} à {TIME_SLOT_LABELS[currentTime] || currentTime}
            </span>
          </p>
        </div>

        <RescheduleModalForm
          todayStr={todayStr}
          newDate={newDate}
          newTime={newTime}
          onDateChange={setNewDate}
          onTimeChange={setNewTime}
          availableSlots={availableSlots}
          isPending={isPending}
        />

        <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
          variant === 'admin'
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-sky-50 border-sky-200 text-sky-800'
        }`}>
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{cfg.defaultInfo}</p>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirm}
        title="Confirmation de Replanification"
        subtitle={`${variant === 'admin' ? 'Modification administrative' : 'Nouveau créneau'}`}
        variant={cfg.confirmVariant}
        isPending={isPending}
        confirmLabel="Appliquer la nouvelle date"
        details={confirmationDetails}
        warningMessage={cfg.defaultWarning}
      />
    </>
  );
}

// Export pour compatibilité
export default RescheduleModal;
