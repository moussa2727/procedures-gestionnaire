'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { ConfirmationModal } from '@/src/components/common';
import { Modal } from '@/src/components/common';

interface RejectProcedureModalProps {
  isOpen: boolean;
  onClose: () => void;
  procedure: any;
  destinationName: string;
  onConfirm: (reason: string) => Promise<void>;
  isPending?: boolean;
}

export function RejectProcedureModal({
  isOpen,
  onClose,
  procedure,
  destinationName,
  onConfirm,
  isPending = false,
}: RejectProcedureModalProps) {
  const [reason, setReason] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!procedure) return null;

  const handleConfirm = () => {
    setShowConfirmation(true);
  };

  const handleFinalConfirm = async () => {
    await onConfirm(reason.trim());
    setShowConfirmation(false);
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !showConfirmation}
        onClose={onClose}
        title="Rejeter la procédure"
        subtitle={`Dossier #${procedure.numeroDossier}`}
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold rounded-xl transition-all"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending || !reason.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
            >
              {isPending ? 'Traitement...' : 'Vérifier & Confirmer'}
            </button>
          </div>
        }
      >
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
          <p>
            <span className="font-semibold text-slate-500">Destination :</span> {destinationName}
          </p>
          <p>
            <span className="font-semibold text-slate-500">Étapes validées :</span>{' '}
            {procedure.steps?.filter((s: any) => s.status === 'COMPLETED').length || 0}/
            {procedure.steps?.length || 0}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Motif du rejet
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Expliquez les raisons du rejet..."
            className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 resize-none"
          />
        </div>

        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>Cette action est irréversible. Le candidat sera notifié du rejet de son dossier.</p>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleFinalConfirm}
        title="Confirmation du Rejet"
        subtitle="Cette action est irréversible"
        variant="danger"
        isPending={isPending}
        confirmLabel="Confirmer le rejet"
        details={[
          { label: 'Dossier', value: `#${procedure.numeroDossier}` },
          { label: 'Destination', value: destinationName },
          { label: 'Motif', value: reason.trim() },
        ]}
        warningMessage="Le dossier sera définitivement rejeté et le candidat en sera informé."
      />
    </>
  );
}