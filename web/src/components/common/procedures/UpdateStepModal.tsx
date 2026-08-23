'use client';

import { useState } from 'react';
import { CheckCircle2, Clock3, XCircle, Send } from 'lucide-react';
import { StepStatus } from '@/src/types/enums';
import { Modal } from '@/src/components/common';

interface UpdateStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  stepName: string;
  currentStatus: StepStatus;
  onConfirm: (status: StepStatus, reason?: string) => Promise<void>;
  isPending?: boolean;
}

export function UpdateStepModal({
  isOpen,
  onClose,
  stepName,
  currentStatus,
  onConfirm,
  isPending = false,
}: UpdateStepModalProps) {
  const [status, setStatus] = useState<StepStatus>(currentStatus);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleConfirm = async () => {
    await onConfirm(status, status === StepStatus.REJECTED ? rejectionReason : undefined);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Modifier l'étape"
      subtitle={stepName}
      maxWidth="lg"
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
            disabled={isPending || (status === StepStatus.REJECTED && !rejectionReason.trim())}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isPending ? 'Enregistrement...' : 'Enregistrer'}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Statut de l'étape
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStatus(StepStatus.COMPLETED)}
              className={`p-3 rounded-xl border text-center text-xs font-medium transition-all ${
                status === StepStatus.COMPLETED
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
              Valider
            </button>
            <button
              type="button"
              onClick={() => setStatus(StepStatus.IN_PROGRESS)}
              className={`p-3 rounded-xl border text-center text-xs font-medium transition-all ${
                status === StepStatus.IN_PROGRESS
                  ? 'bg-sky-50 border-sky-500 text-sky-700 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Clock3 className="w-4 h-4 mx-auto mb-1 text-sky-600" />
              En cours
            </button>
            <button
              type="button"
              onClick={() => setStatus(StepStatus.REJECTED)}
              className={`p-3 rounded-xl border text-center text-xs font-medium transition-all ${
                status === StepStatus.REJECTED
                  ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <XCircle className="w-4 h-4 mx-auto mb-1 text-red-600" />
              Rejeter
            </button>
          </div>
        </div>

        {status === StepStatus.REJECTED && (
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Motif du rejet
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Expliquez les raisons du rejet..."
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 resize-none"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}