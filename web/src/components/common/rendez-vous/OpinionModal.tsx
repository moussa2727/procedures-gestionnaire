'use client';

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Clock, Send, X } from 'lucide-react';
import { Opinion } from '@/src/types/enums';
import type { RendezVousResponse } from '@/src/types/rendez-vous';
import { Modal } from '@/src/components/common';

interface OpinionModalProps {
  isOpen: boolean;
  onClose: () => void;
  rendezVous: RendezVousResponse | null;
  destinationName: string;
  onSave: (opinion: Opinion) => Promise<void>;
  isPending?: boolean;
}

export function OpinionModal({
  isOpen,
  onClose,
  rendezVous,
  destinationName,
  onSave,
  isPending = false,
}: OpinionModalProps) {
  const [opinionChoice, setOpinionChoice] = useState<Opinion>(Opinion.FAVORABLE);
  const [notes, setNotes] = useState('');

  if (!rendezVous) return null;

  const handleSave = async () => {
    await onSave(opinionChoice);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Avis d'Orientation Académique"
      subtitle={`${rendezVous.firstName} ${rendezVous.lastName}`}
      maxWidth="lg"
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
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isPending ? 'Enregistrement...' : "Enregistrer l'Avis"}</span>
          </button>
        </div>
      }
    >
      {/* Student brief */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
        <div className="font-semibold text-slate-900">
          Candidat : {rendezVous.firstName} {rendezVous.lastName}
        </div>
        <div className="text-slate-500">
          Filière : {rendezVous.sector} ({rendezVous.studyLevel}) • Destination : {destinationName}
        </div>
      </div>

      {/* Opinion Choice Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Décision d'Orientation
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setOpinionChoice(Opinion.FAVORABLE)}
            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
              opinionChoice === Opinion.FAVORABLE
                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
            }`}
          >
            <ThumbsUp className="w-4 h-4 text-emerald-600" />
            <span className="text-xs">Favorable</span>
          </button>

          <button
            type="button"
            onClick={() => setOpinionChoice(Opinion.PENDING)}
            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
              opinionChoice === Opinion.PENDING
                ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs">À Compléter</span>
          </button>

          <button
            type="button"
            onClick={() => setOpinionChoice(Opinion.UNFAVORABLE)}
            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
              opinionChoice === Opinion.UNFAVORABLE
                ? 'bg-red-50 border-red-500 text-red-900 font-bold shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
            }`}
          >
            <ThumbsDown className="w-4 h-4 text-red-600" />
            <span className="text-xs">Défavorable</span>
          </button>
        </div>
      </div>

      {/* Notes Input */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700">
          Préconisations & Notes Détaillées
        </label>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: Dossier recevable. Prérequis linguistique validé (IELTS 7.0). Universités cibles recommandées : McGill et Concordia."
          className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-0 focus:border-sky-600 focus:bg-white transition-colors resize-none"
        />
      </div>
    </Modal>
  );
}