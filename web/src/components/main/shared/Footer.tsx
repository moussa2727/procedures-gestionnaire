// src/components/home/Footer.tsx
'use client';

import { Phone, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import Logo from '@/public/images/paname-consulting.jpg';

const FaTiktok = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 5 20.1a6.33 6.33 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const FaInstagram = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z" />
  </svg>
);
const FaWhatsapp = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.032 2.001c-5.514 0-9.98 4.465-9.98 9.977 0 1.756.456 3.48 1.32 4.993L2 22l5.247-1.347c1.456.792 3.104 1.21 4.785 1.21 5.514 0 9.98-4.465 9.98-9.977 0-5.512-4.466-9.978-9.98-9.978zm0 18.354c-1.507 0-2.987-.406-4.254-1.166l-.305-.18-3.116.8.833-3.033-.198-.316c-.825-1.316-1.26-2.83-1.26-4.383 0-4.598 3.744-8.34 8.34-8.34 4.598 0 8.34 3.742 8.34 8.34 0 4.596-3.742 8.338-8.34 8.338zm4.574-6.248c-.25-.125-1.483-.73-1.713-.814-.23-.083-.397-.125-.564.124-.167.25-.645.814-.792.98-.146.167-.292.188-.543.063-.25-.125-1.055-.39-2.01-1.238-.742-.66-1.243-1.476-1.388-1.726-.146-.25-.015-.385.11-.51.112-.112.25-.292.374-.438.125-.146.167-.25.25-.416.084-.167.042-.313-.02-.438-.063-.125-.563-1.352-.77-1.85-.203-.488-.41-.423-.563-.43-.146-.008-.313-.008-.48-.008-.167 0-.438.063-.668.313-.23.25-.877.855-.877 2.085 0 1.23.896 2.418 1.02 2.586.125.167 1.763 2.69 4.266 3.768.596.256 1.062.41 1.424.524.6.19 1.144.163 1.575.099.48-.07 1.483-.606 1.693-1.19.21-.585.21-1.087.147-1.19-.063-.104-.23-.167-.48-.292z" />
  </svg>
);

export default function Footer() {
  return (
    <footer
      role="contentinfo"
      className="w-full border-t border-sky-100 bg-sky-50/60 px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 md:gap-10">
          <section className="space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-full md:h-14 md:w-14 shadow-sm">
                <Image
                  src={Logo}
                  alt="Logo Paname Consulting"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 48px, 56px"
                />
              </div>
              <span className="text-xl font-bold text-slate-800">PANAME CONSULTING</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-500">
              Votre partenaire pour des études internationales réussies. Nous accompagnons les
              étudiants vers les meilleures opportunités académiques à travers le monde.
            </p>
            <div className="flex items-start gap-2 text-slate-500">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
              <span className="text-sm">
                Kalaban Coura, Imm.Bore <br />
                en face de l&apos;hôtel Wassulu
              </span>
            </div>
          </section>

          <section className="space-y-4 text-left">
            <h2 className="border-b border-sky-200 pb-2 text-lg font-semibold text-slate-800">
              Nos Services
            </h2>
            <nav aria-label="Liste des services proposés">
              <ul className="space-y-2.5 text-sm text-slate-500">
                {[
                  'Orientation académique personnalisée',
                  "Préparation des dossiers d'admission",
                  'Assistance pour les visas étudiants',
                  'Préparation aux entretiens',
                  'Suivi post-admission',
                ].map((service, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                    {service}
                  </li>
                ))}
              </ul>
            </nav>
          </section>

          <section className="space-y-4 text-left md:col-span-2 lg:col-span-1">
            <div className="space-y-4">
              <h2 className="border-b border-sky-200 pb-2 text-lg font-semibold text-slate-800">
                Contact
              </h2>
              <div className="space-y-3">
                <a
                  href="tel:+22391830941"
                  className="flex items-center gap-3 rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors duration-200 hover:border-sky-300 hover:bg-sky-100 min-h-11"
                >
                  <Phone className="h-4 w-4 text-sky-600" strokeWidth={1.8} />
                  +223 91 83 09 41
                </a>
               
                <a
                  href="https://wa.me/22391830941"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm font-medium text-emerald-700 transition-colors duration-200 hover:border-emerald-300 hover:bg-emerald-100 min-h-11"
                >
                  <FaWhatsapp />
                  WhatsApp
                </a>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="border-b border-sky-200 pb-2 text-lg font-semibold text-slate-800">
                Légal
              </h3>
              <div className="space-y-2 text-sm text-slate-500">
                <Link href="/conditions" className="block hover:text-sky-600 transition-colors">
                  Conditions d&apos;utilisation
                </Link>
                <Link href="/politique" className="block hover:text-sky-600 transition-colors">
                  Politique de confidentialité
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="border-b border-sky-200 pb-2 text-lg font-semibold text-slate-800">
                Réseaux sociaux
              </h3>
              <div className="flex gap-3">
                <a
                  href="https://www.instagram.com/paname_consulting/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="rounded-xl border border-sky-200 bg-white p-3 text-slate-600 transition-colors duration-200 hover:border-pink-300 hover:bg-pink-50 hover:text-pink-600"
                >
                  <FaInstagram />
                </a>
                <a
                  href="https://www.tiktok.com/@paname.consulting"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="rounded-xl border border-sky-200 bg-white p-3 text-slate-600 transition-colors duration-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                >
                  <FaTiktok />
                </a>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-10 border-t border-sky-200 pt-6">
          <p className="text-center text-sm text-slate-400">
            © {new Date().getFullYear()} Paname Consulting. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
