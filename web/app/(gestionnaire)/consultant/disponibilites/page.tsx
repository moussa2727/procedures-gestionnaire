'use client';

import { useMemo, useState } from 'react';
import { CalendarX, CalendarClock, Info, Calendar, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useMyUnavailabilities, useRemoveAbsence } from '@/src/hooks/use-consultant-unavailability';
import { useMyRendezVousAsConsultant } from '@/src/hooks/use-rendez-vous';
import { useMyProfile } from '@/src/hooks/use-users';
import { useConsultantUnavailabilityRealtime } from '@/src/hooks/use-consultant-unavailability';

import { LoadingState, EmptyState, ConfirmationModal } from '@/src/components/common';
import { AbsenceType, ABSENCE_TYPE_LABELS } from '@/src/types/enums';
import type { UnavailabilityResponse } from '@/src/types/availability';

export default function ConsultantDisponibilitesPage() {
  const { isLoading: profileLoading } = useMyProfile();
  const { data: unavailabilities, isLoading: unavailabilitiesLoading } = useMyUnavailabilities();
  const { data: rendezVous, isLoading: rendezVousLoading } = useMyRendezVousAsConsultant();
  const removeAbsence = useRemoveAbsence();

  const [absenceToDelete, setAbsenceToDelete] = useState<string | null>(null);

  useConsultantUnavailabilityRealtime();

  const upcomingUnavailabilities = useMemo(() => {
    if (!unavailabilities) return [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return unavailabilities.filter((u: UnavailabilityResponse) => {
      const end = new Date(u.endDate);
      return end >= now;
    });
  }, [unavailabilities]);

  const pastUnavailabilities = useMemo(() => {
    if (!unavailabilities) return [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return unavailabilities.filter((u: UnavailabilityResponse) => {
      const end = new Date(u.endDate);
      return end < now;
    });
  }, [unavailabilities]);

  const upcomingAppointments = useMemo(() => {
    if (!rendezVous) return 0;
    const now = new Date();
    return rendezVous.filter((r: { date: string; status: string }) => {
      const date = new Date(r.date);
      return date >= now && r.status !== 'CANCELLED';
    }).length;
  }, [rendezVous]);

  const confirmedAppointments = useMemo(() => {
    if (!rendezVous) return 0;
    return rendezVous.filter((r: { status: string }) => r.status === 'CONFIRMED').length;
  }, [rendezVous]);

  const handleDeleteAbsence = async (id: string) => {
    try {
      await removeAbsence.mutateAsync(id);
      toast.success('Absence supprimée');
      setAbsenceToDelete(null);
    } catch {
      toast.error("Erreur lors de la suppression de l'absence");
    }
  };

  if (profileLoading || unavailabilitiesLoading || rendezVousLoading) {
    return <LoadingState message="Chargement de vos disponibilités..." />;
  }

  return (
    <section aria-labelledby="disponibilites-title" className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-700">Disponibilités</p>
        <h1 id="disponibilites-title" className="text-3xl font-bold text-slate-900">
          Gérer mes disponibilités
        </h1>
        <p className="text-sm text-slate-500">
          Consultez vos absences et rendez-vous programmés. Les créneaux disponibles sont calculés automatiquement selon vos destinations assignées.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CalendarClock className="w-4 h-4 text-sky-600" />
            Rendez-vous à venir
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{upcomingAppointments}</p>
          <p className="mt-2 text-sm text-slate-500">{confirmedAppointments} confirmés</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CalendarX className="w-4 h-4 text-amber-600" />
            Absences à venir
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{upcomingUnavailabilities.length}</p>
          <p className="mt-2 text-sm text-slate-500">
            {upcomingUnavailabilities.length > 0
              ? `Prochaine : ${ABSENCE_TYPE_LABELS[upcomingUnavailabilities[0].type as AbsenceType] || 'Autre'}`
              : 'Aucune absence prévue'}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Info className="w-4 h-4 text-slate-400" />
            Historique
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{pastUnavailabilities.length}</p>
          <p className="mt-2 text-sm text-slate-500">absences passées</p>
        </article>
      </div>

      {upcomingUnavailabilities.length === 0 && pastUnavailabilities.length === 0 ? (
        <EmptyState
          title="Aucune absence déclarée"
          description="Vous n'avez pas encore déclaré d'absence. Utilisez le bouton ci-dessous pour en créer une."
          icon={<CalendarX className="w-7 h-7" />}
        />
      ) : (
        <div className="space-y-6">
          {upcomingUnavailabilities.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">Absences à venir</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {upcomingUnavailabilities.map((absence: UnavailabilityResponse) => (
                  <div
                    key={absence.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Du {absence.startDate} au {absence.endDate}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {ABSENCE_TYPE_LABELS[absence.type as AbsenceType] || absence.type}
                        </div>
                        {absence.reason && (
                          <p className="text-slate-500 mt-1 italic">&ldquo;{absence.reason}&rdquo;</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAbsenceToDelete(absence.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        title="Supprimer l'absence"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pastUnavailabilities.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">Historique des absences</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pastUnavailabilities.map((absence: UnavailabilityResponse) => (
                  <div
                    key={absence.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm opacity-75"
                  >
                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Du {absence.startDate} au {absence.endDate}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {ABSENCE_TYPE_LABELS[absence.type as AbsenceType] || absence.type}
                      </div>
                      {absence.reason && (
                        <p className="text-slate-500 mt-1 italic">&ldquo;{absence.reason}&rdquo;</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {absenceToDelete && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setAbsenceToDelete(null)}
          onConfirm={() => handleDeleteAbsence(absenceToDelete)}
          title="Supprimer l'absence"
          subtitle="Cette action est irréversible."
          variant="danger"
          isPending={removeAbsence.isPending}
          confirmLabel={removeAbsence.isPending ? 'Suppression...' : 'Confirmer la suppression'}
          warningMessage="L'absence sera définitivement supprimée. Les créneaux correspondants pourraient redevenir disponibles."
        />
      )}
    </section>
  );
}
