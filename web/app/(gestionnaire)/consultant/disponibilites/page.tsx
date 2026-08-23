export default function ConsultantDisponibilitesPage() {
  return (
    <section aria-labelledby="disponibilites-title" className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-700">Disponibilités</p>
        <h1 id="disponibilites-title" className="text-3xl font-bold text-slate-900">
          Gérer mes disponibilités
        </h1>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Disponibilité actuelle</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">12 créneaux</p>
          <p className="mt-2 text-sm text-emerald-700">3 à venir cette semaine</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Consultations programmées</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">8</p>
          <p className="mt-2 text-sm text-sky-700">2 non confirmées</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Absences prévues</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">2</p>
          <p className="mt-2 text-sm text-amber-700">À valider</p>
        </article>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Espace de gestion des disponibilités</h2>
        <p className="mt-2 text-sm text-slate-600">
          Cette vue sera complétée avec la gestion des créneaux, des absences et des rendez-vous à venir.
        </p>
      </div>
    </section>
  );
}