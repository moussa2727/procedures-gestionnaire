// components/admin/agenda/AdminAgendaView.tsx
'use client';

import { useState, useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { LoadingState, EmptyState } from '@/src/components/common';
import { AdminAgendaSlot } from './AdminAgendaSlot';
import { AdminAgendaFilters } from './AdminAgendaFilters';
import { useDayAvailability } from '@/src/hooks/use-availability';
import { useConsultantsSemiPublic } from '@/src/hooks/use-users';
import { useAllRendezVousAdmin } from '@/src/hooks/use-rendez-vous';
import { useDestinations } from '@/src/hooks/use-destinations';
import { TimeSlot, RendezvousStatus } from '@/src/types/enums';
import type { RendezVousResponse } from '@/src/types/rendez-vous';

interface AdminAgendaViewProps {
  onViewAppointment?: (appointment: RendezVousResponse) => void;
  onComplete?: (appointment: RendezVousResponse) => void;
  onCancel?: (appointment: RendezVousResponse) => void;
  className?: string;
}

export function AdminAgendaView({
  onViewAppointment,
  onComplete,
  onCancel,
  className = '',
}: AdminAgendaViewProps) {
  // État
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedConsultantId, setSelectedConsultantId] = useState('all');

  // Queries
  const { data: consultantsRaw, isLoading: isLoadingConsultants } = useConsultantsSemiPublic();
  const { data: destinationsRaw } = useDestinations();
  const { data: rendezVousRaw, isLoading: isLoadingRendezVous } = useAllRendezVousAdmin();
  const { data: availabilityRaw, isLoading: isLoadingAvailability } = useDayAvailability(
    // On utilise une destination fictive pour récupérer les disponibilités générales
    // Dans un cas réel, on pourrait avoir une endpoint spécifique pour l'agenda admin
    'all',
    selectedDate,
    selectedConsultantId === 'all' ? undefined : selectedConsultantId
  );

  // Transform data
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

  // Filtrer les rendez-vous du jour
  const dayRendezVous = useMemo(() => {
    return rendezVous.filter((r: RendezVousResponse) => r.date === selectedDate);
  }, [rendezVous, selectedDate]);

  // Filtrer par consultant
  const filteredDayRendezVous = useMemo(() => {
    if (selectedConsultantId === 'all') return dayRendezVous;
    return dayRendezVous.filter((r: RendezVousResponse) => r.consultantId === selectedConsultantId);
  }, [dayRendezVous, selectedConsultantId]);

  // Créer un map des créneaux horaires
  const slotsMap = useMemo(() => {
    const map: Record<TimeSlot, RendezVousResponse | null> = {
      [TimeSlot.SLOT_0900]: null,
      [TimeSlot.SLOT_0930]: null,
      [TimeSlot.SLOT_1000]: null,
      [TimeSlot.SLOT_1030]: null,
      [TimeSlot.SLOT_1100]: null,
      [TimeSlot.SLOT_1130]: null,
      [TimeSlot.SLOT_1400]: null,
      [TimeSlot.SLOT_1430]: null,
      [TimeSlot.SLOT_1500]: null,
      [TimeSlot.SLOT_1530]: null,
      [TimeSlot.SLOT_1600]: null,
      [TimeSlot.SLOT_1630]: null,
    };

    filteredDayRendezVous.forEach((r: RendezVousResponse) => {
      const timeKey = r.time as TimeSlot;
      if (timeKey in map) {
        map[timeKey] = r;
      }
    });

    return map;
  }, [filteredDayRendezVous]);

  // Helpers
  const getDestinationName = (destId: string) => {
    const found = destinations.find((d: any) => d.id === destId);
    return found ? found.country : 'Destination';
  };

  const getConsultantName = (consultantId: string) => {
    const found = consultants.find((c: any) => c.id === consultantId);
    return found ? `${found.firstName} ${found.lastName}` : 'Consultant';
  };

  const isLoading = isLoadingConsultants || isLoadingRendezVous || isLoadingAvailability;

  const handleRefresh = () => {
    // Les hooks se rafraîchiront automatiquement via les dépendances
  };

  // Actions sur les rendez-vous
  const handleComplete = (appointment: RendezVousResponse) => {
    if (onComplete) onComplete(appointment);
  };

  const handleCancel = (appointment: RendezVousResponse) => {
    if (onCancel) onCancel(appointment);
  };

  const handleView = (appointment: RendezVousResponse) => {
    if (onViewAppointment) onViewAppointment(appointment);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-sky-600" />
            Agenda des consultations
          </h2>
          <p className="text-sm text-slate-500">
            Vue quotidienne des rendez-vous par créneau horaire
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            Occupé
          </span>
          <span className="inline-flex items-center gap-1 ml-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 border border-dashed" />
            Libre
          </span>
          <span className="inline-flex items-center gap-1 ml-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Réalisé
          </span>
        </div>
      </div>

      {/* Filtres */}
      <AdminAgendaFilters
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        selectedConsultantId={selectedConsultantId}
        onConsultantChange={setSelectedConsultantId}
        consultants={consultants}
        onRefresh={handleRefresh}
      />

      {/* Contenu de l'agenda */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8">
          <LoadingState message="Chargement de l'agenda..." />
        </div>
      ) : Object.values(slotsMap).every((slot) => slot === null) ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8">
          <EmptyState
            title="Aucun rendez-vous"
            description={`Aucun rendez-vous programmé pour le ${new Date(selectedDate).toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}${selectedConsultantId !== 'all' ? ' pour ce consultant' : ''}.`}
            icon={<CalendarDays className="w-7 h-7" />}
          />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="space-y-3">
            {Object.entries(slotsMap).map(([timeKey, appointment]) => {
              const consultantName = appointment ? getConsultantName(appointment.consultantId) : undefined;
              const destinationName = appointment ? getDestinationName(appointment.destinationId) : undefined;

              return (
                <AdminAgendaSlot
                  key={timeKey}
                  time={timeKey as TimeSlot}
                  appointment={appointment}
                  consultantName={consultantName}
                  destinationName={destinationName}
                  onViewAppointment={onViewAppointment ? handleView : undefined}
                  onComplete={onComplete ? handleComplete : undefined}
                  onCancel={onCancel ? handleCancel : undefined}
                />
              );
            })}
          </div>

          {/* Résumé du jour */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span>
                <span className="font-semibold text-slate-700">
                  {filteredDayRendezVous.filter((r: any) => r.status === RendezvousStatus.CONFIRMED).length}
                </span>{' '}
                confirmés
              </span>
              <span>
                <span className="font-semibold text-slate-700">
                  {filteredDayRendezVous.filter((r: any) => r.status === RendezvousStatus.PENDING).length}
                </span>{' '}
                en attente
              </span>
              <span>
                <span className="font-semibold text-slate-700">
                  {filteredDayRendezVous.filter((r: any) => r.status === RendezvousStatus.COMPLETED).length}
                </span>{' '}
                réalisés
              </span>
              <span>
                <span className="font-semibold text-slate-700">
                  {filteredDayRendezVous.filter((r: any) => r.status === RendezvousStatus.CANCELLED).length}
                </span>{' '}
                annulés
              </span>
            </div>
            <span className="text-slate-400">
              {filteredDayRendezVous.length} rendez-vous au total
            </span>
          </div>
        </div>
      )}
    </div>
  );
}