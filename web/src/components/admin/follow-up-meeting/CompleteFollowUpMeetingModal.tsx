'use client';

import { TIME_SLOT_LABELS } from '@/src/types/enums';
import type { FollowUpMeetingResponse } from '@/src/types/follow-up-meeting';
import { ConfirmationModal } from '@/src/components/common';

interface CompleteFollowUpMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: FollowUpMeetingResponse | null;
  studentName: string;
  formattedDate: string;
  onConfirm: () => Promise<void>;
  isPending?: boolean;
}

export function CompleteFollowUpMeetingModal({
  isOpen,
  onClose,
  meeting,
  studentName,
  formattedDate,
  onConfirm,
  isPending = false,
}: CompleteFollowUpMeetingModalProps) {
  if (!meeting) return null;

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Marquer le rendez-vous comme effectué"
      subtitle={`${studentName}`}
      variant="success"
      isPending={isPending}
      confirmLabel="Confirmer"
      details={[
        { label: 'Étudiant', value: studentName },
        { label: 'Date & Heure', value: `${formattedDate} à ${TIME_SLOT_LABELS[meeting.time]}` },
      ]}
      warningMessage="Cette action confirme la réalisation du rendez-vous de suivi. L'étudiant en sera informé."
    />
  );
}