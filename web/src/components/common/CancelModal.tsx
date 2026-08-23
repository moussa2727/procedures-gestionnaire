// components/common/CancelModal.tsx
'use client';

import React, { useState } from 'react';
import { AlertCircle, Info, X } from 'lucide-react';
import { Modal } from './Modal';
import { ConfirmationModal } from './ConfirmationModal';

export interface CancelModalProps {
  /** Contrôle d'ouverture */
  isOpen: boolean;
  
  /** Fermeture */
  onClose: () => void;
  
  /** Confirmation */
  onConfirm: (reason: string) => Promise<void>;
  
  /** Titre */
  title: string;
  
  /** Sous-titre */
  subtitle: string;
  
  /** Détails à afficher (champs spécifiques) */
  details: { label: string; value: string }[];
  
  /** Message d'information (personnalisé selon le type) */
  infoMessage: string;
  
  /** Motif d'annulation requis ? */
  reasonRequired?: boolean;
  
  /** Motifs rapides proposés */
  quickReasons?: string[];
  
  /** Placeholder du textarea */
  reasonPlaceholder?: string;
  
  /** État de chargement */
  isPending?: boolean;
}

/**
 * Composant d'annulation unifié
 * Utilisé pour les rendez-vous, procédures, follow-up meetings
 */
export function CancelModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  details,
  infoMessage,
  reasonRequired = false,
  quickReasons = [],
  reasonPlaceholder = 'Précisez la raison de l\'annulation...',
  isPending = false,
}: CancelModalProps) {
  const [reason, setReason] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Réinitialiser quand la modale s'ouvre
  React.useEffect(() => {
    if (isOpen) {
      setReason('');
      setShowConfirmation(false);
    }
  }, [isOpen]);

  const handleOpenConfirmation = () => {
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    await onConfirm(reason.trim() || 'Annulation');
    setShowConfirmation(false);
    onClose();
  };

  // Détails pour la confirmation
  const confirmationDetails = [
    ...details,
    { label: 'Motif', value: reason.trim() || 'Non spécifié' },
  ];

  return (
    <>
      {/* Modal de saisie du motif */}
      <Modal
        isOpen={isOpen && !showConfirmation}
        onClose={onClose}
        title={title}
        subtitle={subtitle}
        maxWidth="md"
        showCloseButton={true}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold rounded-xl transition-all"
            >
              Conserver
            </button>
            <button
              type="button"
              onClick={handleOpenConfirmation}
              disabled={isPending || (reasonRequired && !reason.trim())}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
            >
              {isPending ? 'Annulation...' : 'Vérifier & Confirmer'}
            </button>
          </div>
        }
      >
        {/* Détails de l'élément */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
          {details.map((item, idx) => (
            <p key={idx}>
              <span className="font-semibold text-slate-500">{item.label} :</span>{' '}
              <span className="text-slate-700">{item.value}</span>
            </p>
          ))}
        </div>

        {/* Motif d'annulation */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Motif d'annulation {reasonRequired && <span className="text-red-500">*</span>}
          </label>

          {/* Motifs rapides */}
          {quickReasons.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {quickReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                    reason === r
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={reasonPlaceholder}
            className={`w-full p-3 bg-white border rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 resize-none ${
              reasonRequired && !reason.trim() ? 'border-red-300' : 'border-slate-300'
            }`}
          />
        </div>

        {/* Message d'information */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{infoMessage}</p>
        </div>
      </Modal>

      {/* Confirmation finale */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirm}
        title={`Confirmation d'Annulation`}
        subtitle="Cette action est irréversible"
        variant="danger"
        isPending={isPending}
        confirmLabel="Confirmer l'annulation"
        details={confirmationDetails}
        warningMessage="Cette action est irréversible. Toutes les parties concernées seront notifiées."
      />
    </>
  );
}