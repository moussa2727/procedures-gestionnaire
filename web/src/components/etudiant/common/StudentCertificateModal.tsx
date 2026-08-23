// components/common/StudentCertificateModal.tsx
'use client';

import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Download, X, FileCheck, Calendar, Clock, User, MapPin, Mail, Phone, GraduationCap, Briefcase } from 'lucide-react';
import { TIME_SLOT_LABELS, TimeSlot } from '@/src/types/enums';

export interface CertificateData {
  /** Identifiant unique */
  id: string;
  /** Nom complet de l'étudiant */
  studentName: string;
  /** Nom du consultant */
  consultantName: string;
  /** Date du rendez-vous */
  date: string;
  /** Créneau horaire */
  time: TimeSlot;
  /** Nom de la destination (pour rendez-vous) ou numéro de dossier (pour follow-up) */
  destinationName?: string;
  /** Numéro de procédure (pour follow-up) */
  procedureNumber?: string;
  /** Avis du consultant (pour rendez-vous) */
  opinion?: string | null;
  /** Email de l'étudiant (pour rendez-vous) */
  email?: string;
  /** Téléphone de l'étudiant (pour rendez-vous) */
  phone?: string;
  /** Niveau d'études (pour rendez-vous) */
  studyLevel?: string;
  /** Secteur / Filière (pour rendez-vous) */
  sector?: string;
  /** Date de création */
  createdAt: string;
  /** Type de document */
  documentType: 'rendezvous' | 'followup';
  /** Informations supplémentaires */
  additionalInfo?: { label: string; value: string }[];
}

interface StudentCertificateModalProps {
  /** Données du certificat */
  data: CertificateData;
  /** Fermeture */
  onClose: () => void;
  /** Classe CSS supplémentaire */
  className?: string;
}

/**
 * Formate une date au format français
 */
function formatFrenchDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formate une date courte
 */
function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function StudentCertificateModal({
  data,
  onClose,
  className = '',
}: StudentCertificateModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const isRendezVous = data.documentType === 'rendezvous';
  const title = isRendezVous
    ? 'Attestation Officielle de Convocation'
    : 'Attestation de Suivi de Procédure';
  const subtitle = isRendezVous
    ? 'Entretien d\'orientation académique'
    : 'Rendez-vous de suivi de dossier';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto ${className}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-6"
      >
        {/* Barre d'outils supérieure */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Imprimer / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Corps de l'attestation - Style A4 */}
        <div
          ref={printRef}
          className="p-8 space-y-6 text-slate-900 bg-white print:p-12 print:bg-white"
        >
          {/* Logo & Entête Officielle */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-sm">
                  EC
                </div>
                <span className="text-lg font-bold tracking-tight">EduConseil International</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Département Mobilité Internationale & Orientation Universitaire
              </p>
            </div>
            <div className="text-right font-mono text-xs text-slate-500">
              <p>
                RÉFÉRENCE : <span className="font-bold text-slate-900">{data.id.toUpperCase()}</span>
              </p>
              <p>DATE D'ÉMISSION : {new Date().toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          {/* Titre Document */}
          <div className="text-center py-2">
            <h2 className="text-xl font-extrabold uppercase tracking-wide text-slate-900">
              {title}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {subtitle}
            </p>
          </div>

          {/* Données Candidat et Entretien */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            {/* Colonne gauche - Informations étudiant */}
            <div className="space-y-1.5">
              <p className="font-bold text-slate-500 uppercase text-[10px]">
                {isRendezVous ? 'Identité du Candidat' : 'Étudiant'}
              </p>
              <p className="font-bold text-slate-900 text-sm">
                {data.studentName}
              </p>
              {isRendezVous && data.email && (
                <p className="text-slate-600 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {data.email}
                </p>
              )}
              {isRendezVous && data.phone && (
                <p className="text-slate-600 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {data.phone}
                </p>
              )}
              {isRendezVous && data.studyLevel && (
                <p className="text-slate-600 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  Niveau : {data.studyLevel}
                </p>
              )}
              {isRendezVous && data.sector && (
                <p className="text-slate-600 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  Filière : {data.sector}
                </p>
              )}
            </div>

            {/* Colonne droite - Détails du rendez-vous */}
            <div className="space-y-1.5">
              <p className="font-bold text-slate-500 uppercase text-[10px]">
                Détails de l'Entretien
              </p>
              {isRendezVous && data.destinationName && (
                <p className="font-bold text-sky-700 text-sm flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Destination : {data.destinationName}
                </p>
              )}
              {!isRendezVous && data.procedureNumber && (
                <p className="font-bold text-sky-700 text-sm flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5" />
                  Dossier n°{data.procedureNumber}
                </p>
              )}
              <p className="text-slate-600 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Consultant : {data.consultantName}
              </p>
              <p className="text-slate-900 font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                Date : {formatFrenchDate(data.date)}
              </p>
              <p className="text-slate-900 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                Heure : {TIME_SLOT_LABELS[data.time] || data.time} (Heure locale)
              </p>
            </div>
          </div>

          {/* Informations supplémentaires */}
          {data.additionalInfo && data.additionalInfo.length > 0 && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              {data.additionalInfo.map((info, idx) => (
                <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block">{info.label}</span>
                  <span className="font-semibold text-slate-800">{info.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Avis si existant */}
          {isRendezVous && data.opinion && (
            <div className={`p-3.5 rounded-xl border text-xs ${
              data.opinion === 'FAVORABLE'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : data.opinion === 'UNFAVORABLE'
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <p className="font-bold">Avis du conseiller : {data.opinion}</p>
            </div>
          )}

          {/* Footer Certificat */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
            <p>EduConseil International — Plateforme certifiée de mobilité académique</p>
            <div className="text-right">
              <span className="font-semibold text-slate-800">Cachet Électronique Valide</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Styles d'impression */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed,
          .fixed * {
            visibility: visible;
          }
          .fixed {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: white;
            padding: 0;
            margin: 0;
            overflow: visible;
          }
          .fixed .bg-slate-900 {
            display: none !important;
          }
          .fixed .max-w-2xl {
            max-width: 100% !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
          .fixed .p-8 {
            padding: 40px !important;
          }
          .print\\:p-12 {
            padding: 48px !important;
          }
          .print\\:bg-white {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </motion.div>
  );
}

export default StudentCertificateModal;