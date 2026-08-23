'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  CheckCircle2,
  ShieldCheck,
  Phone,
  Users,
  Globe,
  TrendingUp,
  Award,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import HeroImage from '@/public/images/Heroimage.webp';

interface StatItem {
  icon: React.ReactNode;
  value: string;
  label: string;
  sub: string;
}

const STATS: StatItem[] = [
  {
    icon: <TrendingUp className="h-5 w-5 text-sky-600" strokeWidth={1.8} />,
    value: '3+',
    label: "Années d'expérience",
    sub: 'Depuis 2023',
  },
  {
    icon: <Globe className="h-5 w-5 text-sky-600" strokeWidth={1.8} />,
    value: '8+',
    label: 'Pays partenaires',
    sub: 'À travers le monde',
  },
  {
    icon: <Users className="h-5 w-5 text-sky-600" strokeWidth={1.8} />,
    value: '100%',
    label: 'Accompagnement',
    sub: 'Personnalisé',
  },
  {
    icon: <Award className="h-5 w-5 text-sky-600" strokeWidth={1.8} />,
    value: '+120',
    label: 'Étudiants accompagnés',
    sub: 'Vers les meilleures universités',
  },
];

export function Hero() {
  return (
    <section className="relative w-full overflow-hidden border-b border-sky-100 bg-white">
      <div className="absolute inset-0 bg-sky-50/60" />

      <div className="absolute -top-24 -left-20 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="absolute top-1/2 -right-20 h-96 w-96 rounded-full bg-sky-100/50 blur-3xl" />

      <div className="absolute inset-0 pointer-events-none">
        <div className="relative h-full w-full">
          <Image
            src={HeroImage}
            alt="Paname Consulting - Accompagnement vers l'excellence"
            fill
            quality={75}
            priority
            sizes="100vw"
            className="object-cover opacity-5"
          />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-360 px-6 sm:px-10 lg:px-12 xl:px-16 py-12 sm:py-16 lg:py-24">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-12 lg:gap-16 xl:gap-24 w-full">
          
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="w-full lg:max-w-2xl xl:max-w-165 text-left shrink-0"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50/80 px-3.5 py-1.5 shadow-sm backdrop-blur-sm">
              <span className="flex h-5 w-5 items-center justify-center text-sky-600" aria-hidden="true">
                <GraduationCap className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <span className="text-xs font-semibold tracking-wide text-sky-900">Paname Consulting</span>
              <span className="h-3 w-px bg-sky-200" />
              <span className="text-[10px] font-medium text-slate-500">Depuis 2023</span>
            </div>

            <h1 className="max-w-xl text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              LE CAP VERS <span className="block text-sky-600">L&apos;EXCELLENCE</span>
            </h1>

            <p className="mt-6 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Depuis 2023, notre équipe multiculturelle accompagne les étudiants ambitieux vers
              les meilleures universités du monde. De la sélection du programme jusqu&apos;à votre
              installation, nous transformons vos ambitions en réussites concrètes.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-white px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-700 shadow-sm border border-slate-200 transition-all duration-200 ease-out hover:bg-slate-50 hover:text-sky-700 hover:border-sky-200"
              >
                <Phone className="h-4 w-4 text-sky-600" strokeWidth={1.8} aria-hidden="true" />
                Contact
              </Link>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium text-slate-500 transition-colors duration-200 hover:text-sky-600"
                aria-label="Voir notre impact"
              >
                <Sparkles className="h-4 w-4 text-sky-500" strokeWidth={1.8} aria-hidden="true" />
                Notre Impact
              </button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-100 pt-6">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                <ShieldCheck className="h-4 w-4 text-sky-600" strokeWidth={1.8} aria-hidden="true" />
                Données sécurisées
              </div>
              <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-sky-600" strokeWidth={1.8} aria-hidden="true" />
                Suivi centralisé
              </div>
              <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                <Users className="h-4 w-4 text-sky-600" strokeWidth={1.8} aria-hidden="true" />
                Équipe dédiée
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STATS.map((stat, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-sky-100 bg-white/80 p-3.5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-sky-200 hover:shadow-md"
                >
                  <div className="flex items-center gap-2">{stat.icon}</div>
                  <p className="mt-2 text-xl font-bold tracking-tight text-slate-900">{stat.value}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
            className="relative w-full max-w-xl lg:max-w-md xl:max-w-lg shrink-0 lg:ml-auto"
          >
            <div className="absolute -inset-1.5 rounded-3xl bg-sky-200/40 opacity-30 blur-lg" />

            <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-white p-2.5 shadow-xl shadow-sky-100/50">
              <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-slate-100">
                <Image
                  src={HeroImage}
                  alt="Équipe Paname Consulting travaillant ensemble"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 ease-out hover:scale-[1.02]"
                />
              </div>

              <div className="flex items-center justify-between gap-4 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Gestion des procédures estudiantines
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Suivi de dossiers
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      <div className="absolute bottom-0 left-0 h-1 w-full bg-sky-400" />
    </section>
  );
}export default Hero;
