import Link from 'next/link';

const modules = [
  { href: '/etudiant/mon-profil', label: 'Mon profil', description: 'Gérez vos informations personnelles et votre compte.' },
  { href: '/etudiant/procedures', label: 'Mes procédures', description: 'Suivez l’avancement de votre dossier.' },
  { href: '/etudiant/mes-rendez-vous', label: 'Mes rendez-vous', description: 'Consultez vos entretiens et disponibilités.' },
  { href: '/etudiant/mes-consultations', label: 'Mes consultations', description: ' Retrouvez les suivis de votre procédure.' },
  { href: '/etudiant/notifications', label: 'Notifications', description: 'Recevez les alertes et mises à jour importantes.' },
];

export default function StudentDashboardPage() {
  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Étudiant</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Mon espace</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Accédez à vos procédures, à vos rendez-vous, à vos consultations et à vos notifications depuis un seul espace.
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
