// app/(gestionnaire)/admin/agenda/[date]/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { LoadingState, EmptyState } from '@/src/components/common';
import { useDayAvailability } from '@/src/hooks/use-availability';
import { useConsultantsSemiPublic } from '@/src/hooks/use-users';
import { useAllRendezVousAdmin } from '@/src/hooks/use-rendez-vous';
import { useDestinations } from '@/src/hooks/use-destinations';
import { TimeSlot, RendezvousStatus, TIME_SLOT_LABELS } from '@/src/types/enums';
import type { RendezVousResponse } from '@/src/types/rendez-vous';
import { ArrowLeft, CalendarDays, Clock, User, MapPin, Mail, Phone, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminAgendaDatePage() {
  const params = useParams();
  const dateParam = params.date as string;
  const router = useRouter();

  const { data: consultantsRaw } = useConsultantsSemiPublic();
  const { data: destinationsRaw } = useDestinations();
  const { data: rendezVousRaw } = useAllRendezVousAdmin();

  const [selectedConsultantId, setSelectedConsultantId] = useState('all');

  const consultants = useMemo(() => {
    if (Array.isArray(consultantsRaw)) return consultantsRaw;
    if (consultantsRaw && Array.isArray((consultantsRaw as any).data)) return (consultantsRaw as any).data;
    return [];
  }, [consultantsRaw]);

  const destinations = useMemo(() => {
    if (Array.isArray(destinationsRaw)) return destinationsRaw;
    if (destinationsRaw && Array.isArray((destinationsRaw as any).data)) return (destinationsRaw as any).data;
    return [];
  }, [destinationsRaw]);

  const rendezVous = useMemo(() => {
    if (Array.isArray(rendezVousRaw)) return rendezVousRaw;
    if (rendezVousRaw && Array.isArray((rendezVousRaw as any).data)) return (rendezVousRaw as any).data;
    return [];
  }, [rendezVousRaw]);

  const dayRendezVous = useMemo(() => {
    return rendezVous.filter((r: RendezVousResponse) => r.date === dateParam);
  }, [rendezVous, dateParam]);

  const filteredRendezVous = useMemo(() => {
    if (selectedConsultantId === 'all') return dayRendezVous;
    return dayRendezVous.filter((r: RendezVousResponse) => r.consultantId === selectedConsultantId);
  }, [dayRendezVous, selectedConsultantId]);

  const slotsMap = useMemo(() => {
    const map: Record<TimeSlot, RendezVousResponse | null> = {
      [TimeSlot.SLOT_0900]: null, [TimeSlot.SLOT_0930]: null, [TimeSlot.SLOT_1000]: null, [TimeSlot.SLOT_1030]: null,
      [TimeSlot.SLOT_1100]: null, [TimeSlot.SLOT_1130]: null, [TimeSlot.SLOT_1400]: null, [TimeSlot.SLOT_1430]: null,
      [TimeSlot.SLOT_1500]: null, [TimeSlot.SLOT_1530]: null, [TimeSlot.SLOT_1600]: null, [TimeSlot.SLOT_1630]: null,
    };
    filteredRendezVous.forEach((r: RendezVousResponse) => {
      const timeKey = r.time as TimeSlot;
      if (timeKey in map) map[timeKey] = r;
    });
    return map;
  }, [filteredRendezVous]);

  const getDestinationName = (destId: string) => {
    const found = destinations.find((d: any) => d.id === destId);
    return found ? found.country : 'Destination';
  };

  const getConsultantName = (consultantId: string) => {
    const found = consultants.find((c: any) => c.id === consultantId);
    return found ? `${found.firstName} ${found.lastName}` : 'Consultant';
  };

  const handleViewAppointment = (appointment: RendezVousResponse) => {
    router.push(`/admin/rendez-vous/${appointment.id}`);
  };

  const isLoading = false;
  const isAllFree = Object.values(slotsMap).every((slot) => slot === null);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link href="/admin/agenda" className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700">
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Agenda du {new Date(dateParam).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h2>
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-sky-600" />
            <span className="text-sm font-semibold text-slate-700">Vue quotidienne</span>
          </div>
          <div className="flex items-center gap-2">
            <select value={selectedConsultantId} onChange={(e) => setSelectedConsultantId(e.target.value)} className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-sky-600">
              <option value="all">Tous les consultants</option>
              {consultants.map((c: any) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <LoadingState message="Chargement de l'agenda..." />
        ) : isAllFree ? (
          <EmptyState title="Aucun rendez-vous" description={`Aucun rendez-vous programmé pour le ${new Date(dateParam).toLocaleDateString('fr-FR')}.`} icon={<CalendarDays className="w-7 h-7" />} />
        ) : (
          <div className="space-y-3">
            {Object.entries(slotsMap).map(([timeKey, appointment]) => {
              const consultantName = appointment ? getConsultantName(appointment.consultantId) : undefined;
              const destinationName = appointment ? getDestinationName(appointment.destinationId) : undefined;
              const timeLabel = TIME_SLOT_LABELS[timeKey as TimeSlot] || timeKey;
              const isOccupied = !!appointment;
              const isCompleted = appointment?.status === RendezvousStatus.COMPLETED;
              const isCancelled = appointment?.status === RendezvousStatus.CANCELLED;

              return (
                <div key={timeKey} className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3.5 rounded-xl border transition-colors ${
                  isOccupied ? isCompleted ? 'bg-emerald-50/40 border-emerald-200' : isCancelled ? 'bg-red-50/40 border-red-200' : 'bg-sky-50/40 border-sky-200' : 'bg-slate-50/50 border-slate-200 border-dashed'
                }`}>
                  <div className="w-16 shrink-0 flex items-center gap-1.5">
                    <Clock className={`w-4 h-4 ${isOccupied ? 'text-sky-600' : 'text-slate-400'}`} />
                    <span className={`text-xs font-bold ${isOccupied ? 'text-slate-800' : 'text-slate-400'}`}>{timeLabel}</span>
                  </div>
                  {isOccupied ? (
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{appointment.firstName} {appointment.lastName}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            appointment.status === RendezvousStatus.CONFIRMED ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                            appointment.status === RendezvousStatus.PENDING ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            appointment.status === RendezvousStatus.COMPLETED ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {appointment.status === RendezvousStatus.COMPLETED && <CheckCircle2 className="w-3 h-3" />}
                            {appointment.status === RendezvousStatus.CANCELLED && <XCircle className="w-3 h-3" />}
                            {appointment.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                          {destinationName && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />{destinationName}</span>}
                          {consultantName && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" />{consultantName}</span>}
                          <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" />{appointment.email}</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => handleViewAppointment(appointment)} className="px-2.5 py-1 bg-white border border-slate-300 hover:border-sky-300 text-slate-700 text-[10px] font-semibold rounded-lg transition-colors flex items-center gap-1 shrink-0">
                        Détails
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 text-xs text-slate-400 italic">Créneau libre</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
