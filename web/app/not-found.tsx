import { Metadata } from 'next';
import Link from 'next/link';



export const metadata: Metadata = {
  title: 'Page introuvable - Paname Consulting',
  description: "La page que vous recherchez n'existe pas ou a été déplacée. Retournez à l'accueil de Paname Consulting.",
  icons: {
    icon: '/favicon.ico',
  },
    robots: { index: false, follow: false }

};

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col items-center justify-center px-4 py-12">
      <main className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8 sm:p-10 text-center">
        
        {/* Code 404 en bleu clair uni */}
        <span className="text-6xl font-bold text-sky-500 block mb-3 tracking-tight">
          404
        </span>

        {/* Titre & Texte */}
        <h1 className="text-xl font-semibold text-slate-800 mb-2">
          Page introuvable
        </h1>
        
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>

        {/* Bouton d'action en bleu clair uni */}
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-medium text-sm px-6 py-3 rounded-xl transition-colors duration-150"
        >
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retourner à l'accueil
        </Link>
      </main>

      {/* Pied de page minimaliste */}
      <footer className="mt-8 text-center">
        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Paname Consulting. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}