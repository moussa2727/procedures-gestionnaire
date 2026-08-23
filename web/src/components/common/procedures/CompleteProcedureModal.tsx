'use client';

import { ConfirmationModal } from '@/src/components/common';


interface CompleteProcedureModalProps {
  isOpen: boolean;
  onClose: () => void;
  procedure: any;
  destinationName: string;
  onConfirm: () => Promise<void>;
  isPending?: boolean;
}

export function CompleteProcedureModal({
  isOpen,
  onClose,
  procedure,
  destinationName,
  onConfirm,
  isPending = false,
}: CompleteProcedureModalProps) {
  if (!procedure) return null;

  const completedSteps = procedure.steps?.filter((s: any) => s.status === 'COMPLETED').length || 0;
  const totalSteps = procedure.steps?.length || 0;

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Terminer la procédure"
      subtitle={`Dossier #${procedure.numeroDossier}`}
      variant="success"
      isPending={isPending}
      confirmLabel="Confirmer la clôture"
      details={[
        { label: 'Destination', value: destinationName },
        { label: 'Étapes validées', value: `${completedSteps}/${totalSteps}` },
      ]}
      warningMessage="Cette action marquera la procédure comme terminée. Elle ne pourra plus être modifiée."
    />
  );
}