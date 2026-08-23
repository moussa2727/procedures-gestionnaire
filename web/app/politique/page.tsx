import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  robots: { index: false, follow: false },
};

export default function PolitiquePage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">Politique de confidentialité</h1>
          <p className="mt-4 text-sm text-slate-600">
            Cette politique décrit la manière dont nous collectons, utilisons et protégeons vos données personnelles.
          </p>
          <div className="mt-8 space-y-6 text-sm text-slate-700">
            <section>
              <h2 className="text-lg font-bold text-slate-900">1. Collecte des données</h2>
              <p className="mt-2">
                Nous collectons les données que vous nous fournissez directement lors de votre inscription et de l&apos;utilisation de la plateforme : nom, prénom, adresse email, numéro de téléphone et informations relatives à vos démarches.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-900">2. Utilisation des données</h2>
              <p className="mt-2">
                Vos données sont utilisées exclusivement pour le traitement de vos dossiers, la communication relative à vos démarches et l&apos;amélioration de nos services.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-900">3. Partage des données</h2>
              <p className="mt-2">
                Nous ne partageons vos données qu&apos;avec les consultants et administrateurs autorisés dans le cadre de votre accompagnement. Aucune donnée n&apos;est transmise à des tiers sans votre consentement.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-900">4. Conservation des données</h2>
              <p className="mt-2">
                Vos données sont conservées pendant la durée nécessaire au traitement de votre dossier, puis archivées conformément aux obligations légales.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-900">5. Contact</h2>
              <p className="mt-2">
                Pour toute question relative à vos données personnelles, vous pouvez nous contacter via le formulaire de contact de la plateforme.
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
