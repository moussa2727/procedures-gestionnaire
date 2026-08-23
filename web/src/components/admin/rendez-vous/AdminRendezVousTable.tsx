'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  FileCheck2,
  CalendarDays,
  CalendarX,
  RotateCcw,
  GraduationCap,
  Mail,
  Phone,
} from 'lucide-react';
import { StatusBadge, OpinionBadge } from '@/src/components/common';
import { TIME_SLOT_LABELS, RendezvousStatus } from '@/src/types/enums';
import type { RendezVousResponse } from '@/src/types/rendez-vous';

interface AdminAppointmentTableProps {
  appointments: RendezVousResponse[];
  getDestinationName: (id: string) => string;
  getConsultantName: (id: string) => string;
  getStudentName: (id: string) => string;
  onComplete?: (rv: RendezVousResponse) => void;
  onOpinion?: (rv: RendezVousResponse) => void;
  onReschedule?: (rv: RendezVousResponse) => void;
  onCancel?: (rv: RendezVousResponse) => void;
  className?: string;
}

function formatFrenchDate(dateStr: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function AdminRendezVousTable({
  appointments,
  getDestinationName,
  getConsultantName,
  getStudentName,
  onComplete,
  onOpinion,
  onReschedule,
  onCancel,
  className = '',
}: AdminAppointmentTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (appointments.length === 0) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl">
        <p className="text-xs text-slate-500">Aucun rendez-vous à afficher</p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Candidat</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Consultant</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Destination</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Date & Heure</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Statut</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Avis</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {appointments.map((rv) => {
              const isExpanded = expandedId === rv.id;
              const canModify = rv.status === RendezvousStatus.CONFIRMED || rv.status === RendezvousStatus.PENDING;

              return (
                <React.Fragment key={rv.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {rv.firstName} {rv.lastName}
                      </div>
                      <div className="text-[10px] text-slate-400">{rv.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {getConsultantName(rv.consultantId)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {getDestinationName(rv.destinationId)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{formatFrenchDate(rv.date)}</div>
                      <div className="text-[10px] text-sky-600">{TIME_SLOT_LABELS[rv.time]}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={rv.status} type="rendezvous" />
                    </td>
                    <td className="px-4 py-3">
                      <OpinionBadge opinion={rv.opinion} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {rv.status === RendezvousStatus.CONFIRMED && onComplete && (
                          <button
                            type="button"
                            onClick={() => onComplete(rv)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Marquer réalisé"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {rv.status === RendezvousStatus.COMPLETED && onOpinion && (
                          <button
                            type="button"
                            onClick={() => onOpinion(rv)}
                            className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                            title="Modifier l'avis"
                          >
                            <FileCheck2 className="w-4 h-4" />
                          </button>
                        )}

                        {canModify && onReschedule && (
                          <button
                            type="button"
                            onClick={() => onReschedule(rv)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Replanifier"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}

                        {canModify && onCancel && (
                          <button
                            type="button"
                            onClick={() => onCancel(rv)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Annuler"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : rv.id)}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded row */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <td colSpan={7} className="px-4 py-3 bg-slate-50/80">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div className="space-y-1">
                              <span className="font-semibold text-slate-700 block">Coordonnées</span>
                              <p className="text-slate-600 flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                {rv.email}
                              </p>
                              <p className="text-slate-600 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                {rv.phone}
                              </p>
                              <p className="text-slate-600 flex items-center gap-1.5">
                                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                                {rv.studyLevel}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="font-semibold text-slate-700 block">Détails</span>
                              <p className="text-slate-600">
                                <span className="text-slate-400">Secteur :</span> {rv.sector}
                              </p>
                              <p className="text-slate-600">
                                <span className="text-slate-400">Créé le :</span> {formatFrenchDate(rv.createdAt)}
                              </p>
                              {rv.cancellationReason && (
                                <p className="text-red-600">
                                  <span className="font-medium">Motif annulation :</span> {rv.cancellationReason}
                                </p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <span className="font-semibold text-slate-700 block">Étudiant</span>
                              <p className="text-slate-600 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                {getStudentName(rv.studentId)}
                              </p>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}