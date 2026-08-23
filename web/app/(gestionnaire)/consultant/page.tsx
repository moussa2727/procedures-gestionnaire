import Link from 'next/link';

const modules = [
  { href: '/consultant/mon-profil', label: 'Mon profil', description: 'Informations personnelles et gestion des sessions.' },
  { href: '/consultant/absences', label: 'Mes absences', description: 'Indisponibilités et congés.' },
  { href: '/consultant/mes-consultations', label: 'Mes consultations', description: 'Suivi des entretiens et rendez-vous.' },
  { href: '/consultant/procedures', label: 'Procédures', description: 'Dossiers étudiants en cours.' },
  { href: '/consultant/mes-etudiants', label: 'Mes étudiants', description: 'Liste des étudiants accompagnés.' },
  { href: '/consultant/mes-statistiques', label: 'Mes statistiques', description: 'Statistiques et indicateurs.' },
  { href: '/consultant/notifications', label: 'Notifications', description: 'Alertes et messages du système.' },
  { href: '/consultant/planifier-consultation', label: 'Planifier une consultation', description: 'Créer une consultation avec un étudiant.' },
];

export default function ConsultantDashboardPage() {
  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Consultant</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Espace de travail</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Suivez vos absences, vos rendez-vous, vos procédures et les demandes de consultation associées à vos étudiants.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
          >
            <p className="text-sm font-semibold text-sky-700">{module.label}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{module.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
