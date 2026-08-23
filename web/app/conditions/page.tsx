import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions d\'utilisation',
  robots: { index: false, follow: false },
};

export default function ConditionsPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">Conditions d&apos;utilisation</h1>
          <p className="mt-4 text-sm text-slate-600">
            En utilisant cette plateforme, vous acceptez les présentes conditions d&apos;utilisation. Veuillez les lire attentivement.
          </p>
          <div className="mt-8 space-y-6 text-sm text-slate-700">
            <section>
              <h2 className="text-lg font-bold text-slate-900">1. Objet</h2>
              <p className="mt-2">
                La plateforme EduConseil International a pour objet de faciliter les démarches de mobilité internationale, l&apos;orientation universitaire et la gestion des procédures administratives.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-900">2. Accès au service</h2>
              <p className="mt-2">
                L&apos;accès à la plateforme est réservé aux utilisateurs inscrits. Vous vous engagez à fournir des informations exactes et à jour lors de votre inscription.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-900">3. Responsabilités</h2>
              <p className="mt-2">
                L&apos;utilisateur est responsable de la confidentialité de ses identifiants et de toutes les activités effectuées sous son compte. La plateforme ne pourra être tenue responsable des dommages indirects résultant de l&apos;utilisation du service.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-900">4. Données personnelles</h2>
              <p className="mt-2">
                Les données personnelles collectées sont traitées conformément au RGPD. Vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos données.
              </p>
            </section>
          </div>
          <div className="mt-8">
            <Link href="/register" className="text-sm font-medium text-sky-600 hover:text-sky-700 transition-colors">
              Retour à l&apos;inscription
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
