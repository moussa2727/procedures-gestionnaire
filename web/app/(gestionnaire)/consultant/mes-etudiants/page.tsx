'use client';

import { useQuery } from '@tanstack/react-query';
import { LoadingState, EmptyState } from '@/src/components/common';
import { userService } from '@/src/services/user.service';
import type { ConsultantStudent } from '@/src/types/user';
import { User, Mail } from 'lucide-react';

export default function ConsultantMesEtudiantsPage() {
  const { data: students, isLoading, error } = useQuery({
    queryKey: ['consultant-students'],
    queryFn: async () => {
      const res = await userService.getMyConsultantProfile();
      // We need the consultant ID first, then fetch students
      return res;
    },
  });

  const { data: studentsList, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['consultant-students-list', students?.id],
    queryFn: async () => {
      if (!students?.id) return [];
      const res = await userService.getConsultantStudents(students.id);
      return res as ConsultantStudent[];
    },
    enabled: !!students?.id,
  });

  if (isLoading || isLoadingStudents) {
    return <LoadingState message="Chargement de vos étudiants..." />;
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-600">Erreur lors du chargement des étudiants</p>
      </div>
    );
  }

  if (!studentsList || studentsList.length === 0) {
    return (
      <EmptyState
        title="Aucun étudiant"
        description="Vous n'avez pas encore d'étudiants associés à vos procédures ou rendez-vous."
      />
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Consultant</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Mes étudiants</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Liste des étudiants accompagnés dans le cadre de vos procédures et rendez-vous.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {studentsList.map((student) => (
          <div
            key={student.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {student.firstName} {student.lastName}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3" />
                  {student.email}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
