// src/components/a-propos/WhyUs.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Award,
  Users,
  Globe,
  Clock,
  ShieldCheck,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';

interface Reason {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const reasons: Reason[] = [
  {
    id: 1,
    title: 'Expertise reconnue',
    description:
      'Fort de 3 années d\'expérience, notre équipe maîtrise parfaitement les systèmes éducatifs internationaux et les procédures administratives.',
    icon: <Award className="h-5 w-5" strokeWidth={1.8} />,
  },
  {
    id: 2,
    title: 'Équipe multiculturelle',
    description:
      'Notre équipe est composée de professionnels issus de différents pays, vous offrant une compréhension fine des cultures et des systèmes locaux.',
    icon: <Users className="h-5 w-5" strokeWidth={1.8} />,
  },
  {
    id: 3,
    title: 'Réseau international',
    description:
      'Nous collaborons avec des universités et partenaires dans 8 pays, vous ouvrant les portes des meilleures institutions académiques.',
    icon: <Globe className="h-5 w-5" strokeWidth={1.8} />,
  },
  {
    id: 4,
    title: 'Suivi personnalisé',
    description:
      'Chaque étudiant bénéficie d\'un accompagnement sur mesure, de la sélection du programme jusqu\'à l\'installation sur place.',
    icon: <MessageSquare className="h-5 w-5" strokeWidth={1.8} />,
  },
  {
    id: 5,
    title: 'Taux de réussite élevé',
    description:
      'Plus de 120 étudiants accompagnés avec un taux de satisfaction de 96%, témoignant de la qualité de notre accompagnement.',
    icon: <TrendingUp className="h-5 w-5" strokeWidth={1.8} />,
  },
  {
    id: 6,
    title: 'Accompagnement 24h/24',
    description:
      'Nos conseillers sont disponibles pour vous répondre à tout moment, pour vous rassurer et vous guider dans vos démarches.',
    icon: <Clock className="h-5 w-5" strokeWidth={1.8} />,
  },
];

export function WhyUs() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="w-full py-12 sm:py-16 lg:py-20 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div
          className={`mx-auto max-w-3xl text-center transition-all duration-700 ease-out ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50/80 px-3 py-1.5">
            <span className="flex h-5 w-5 items-center justify-center text-sky-600" aria-hidden="true">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span className="text-xs font-medium tracking-wide text-sky-700">Pourquoi nous choisir</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Pourquoi choisir <span className="text-sky-600">Paname Consulting</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 sm:text-base">
            Une équipe passionnée à votre service pour transformer vos ambitions en réussites concrètes.
          </p>
        </div>

        {/* Grille des raisons */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:mt-12 lg:grid-cols-3 lg:gap-6">
          {reasons.map((reason, index) => (
            <div
              key={reason.id}
              className={`group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-sky-200 hover:shadow-md ${
                index === 0 || index === 1 ? 'lg:mt-0' : ''
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition-colors duration-200 group-hover:bg-sky-100">
                {reason.icon}
              </div>
              <h3 className="mt-3 text-base font-semibold text-slate-800">{reason.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{reason.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}export default WhyUs;
