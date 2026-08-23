// common/ConfirmationModal.tsx (version améliorée)
'use client';

import React from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  CalendarDays, 
  RefreshCw,
  XCircle,
  Info,
} from 'lucide-react';
import { Modal } from './Modal';

export interface ConfirmationModalProps {
  /** Contrôle d'ouverture */
  isOpen: boolean;
  
  /** Fermeture */
  onClose: () => void;
  
  /** Action de confirmation */
  onConfirm: () => Promise<void> | void;
  
  /** Titre */
  title: string;
  
  /** Sous-titre */
  subtitle?: string;
  
  /** Détails à afficher */
  details?: { label: string; value: string }[];
  
  /** Message d'avertissement */
  warningMessage?: string;
  
  /** Message d'information (vert) */
  infoMessage?: string;
  
  /** Libellé du bouton de confirmation */
  confirmLabel?: string;
  
  /** Libellé du bouton d'annulation */
  cancelLabel?: string;
  
  /** Variante visuelle */
  variant?: 'danger' | 'warning' | 'success' | 'primary';
  
  /** État de chargement */
  isPending?: boolean;
  
  /** Icône personnalisée */
  icon?: React.ElementType;
  
  /** Si l'icône doit être affichée */
  showIcon?: boolean;
  
  /** Contenu personnalisé */
  children?: React.ReactNode;
  
  /** Classe CSS supplémentaire */
  className?: string;
}

const variantConfigs = {
  danger: {
    Icon: AlertTriangle,
    iconBg: 'bg-red-50 border-red-200 text-red-600',
    buttonBg: 'bg-red-600 hover:bg-red-700 active:bg-red-800',
    warningBg: 'bg-red-50/80 border-red-200 text-red-900',
    borderColor: 'border-red-200',
  },
  warning: {
    Icon: AlertCircle,
    iconBg: 'bg-amber-50 border-amber-200 text-amber-600',
    buttonBg: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800',
    warningBg: 'bg-amber-50/80 border-amber-200 text-amber-900',
    borderColor: 'border-amber-200',
  },
  success: {
    Icon: CheckCircle2,
    iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    buttonBg: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
    warningBg: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
    borderColor: 'border-emerald-200',
  },
  primary: {
    Icon: CalendarDays,
    iconBg: 'bg-sky-50 border-sky-200 text-sky-600',
    buttonBg: 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800',
    warningBg: 'bg-sky-50/80 border-sky-200 text-sky-900',
    borderColor: 'border-sky-200',
  },
};

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  details = [],
  warningMessage,
  infoMessage,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  isPending = false,
  icon: CustomIcon,
  showIcon = true,
  className = '',
  children,
}: ConfirmationModalProps) {
  const config = variantConfigs[variant];
  const Icon = CustomIcon || config.Icon;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxWidth="lg"
      showCloseButton={false}
      className={className}
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className={`px-4 py-2 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 ${config.buttonBg} disabled:opacity-60`}
          >
            {isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{isPending ? 'Traitement...' : confirmLabel}</span>
          </button>
        </div>
      }
    >
      {/* Icône */}
      {showIcon && (
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${config.iconBg}`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
      )}

      {/* Détails */}
      {details.length > 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-2 text-xs">
          {details.map((item, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
              <span className="font-semibold text-slate-600 shrink-0">{item.label} :</span>
              <span className="text-slate-900 font-medium sm:text-right text-balance">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Message d'avertissement (danger/warning) */}
      {warningMessage && (
        <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${config.warningBg}`}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{warningMessage}</p>
        </div>
      )}

       {/* Message d'information (success/primary) */}
       {infoMessage && variant !== 'danger' && variant !== 'warning' && (
         <div className="p-3 rounded-xl border bg-sky-50/80 border-sky-200 text-sky-900 flex items-start gap-2.5 text-xs">
           <Info className="w-4 h-4 shrink-0 mt-0.5" />
           <p className="leading-relaxed">{infoMessage}</p>
         </div>
       )}

       {/* Contenu personnalisé */}
       {children}
     </Modal>
  );
}