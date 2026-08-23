// src/components/home/FrenchSchool.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  GraduationCap,
  Building2,
  Calendar,
  Euro,
  School,
  Landmark,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface FormationItem {
  label: string;
  price?: string;
  period?: string;
  icon: React.ReactNode;
}

interface Formation {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  items: FormationItem[];
}

const formationsData: Formation[] = [
  {
    id: 'publiques',
    title: 'Universités Publiques',
    icon: <Landmark className="h-6 w-6 text-sky-600" strokeWidth={1.8} />,
    description: 'Formations de qualité à tarifs accessibles (170€ à 3 770€/an)',
    items: [
      {
        label: 'Licence',
        price: '170€ à 2 770€/an',
        icon: <GraduationCap className="h-4 w-4 text-sky-500" strokeWidth={1.8} />,
      },
      {
        label: 'Master',
        price: '270€ à 3 770€/an',
        icon: <GraduationCap className="h-4 w-4 text-sky-500" strokeWidth={1.8} />,
      },
      {
        label: 'Candidatures',
        period: 'Oct à Jan',
        icon: <Calendar className="h-4 w-4 text-sky-500" strokeWidth={1.8} />,
      },
    ],
  },
  {
    id: 'privees',
    title: 'Écoles Privées',
    icon: <Building2 className="h-6 w-6 text-sky-600" strokeWidth={1.8} />,
    description: 'Programmes spécialisés et professionnalisants',
    items: [
      {
        label: 'Bachelor 1 & 2',
        price: 'dès 5 000€/an',
        icon: <Layers className="h-4 w-4 text-sky-500" strokeWidth={1.8} />,
      },
      {
        label: 'Bachelor 3 à Master',
        price: 'dès 8 000€/an',
        icon: <Layers className="h-4 w-4 text-sky-500" strokeWidth={1.8} />,
      },
      {
        label: 'Candidatures',
        period: '2 mois avant rentrée',
        icon: <Calendar className="h-4 w-4 text-sky-500" strokeWidth={1.8} />,
      },
    ],
  },
];

const FrenchSchool: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="w-full bg-white py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div
          className={`mx-auto max-w-3xl text-center transition-all duration-700 ease-out ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50/80 px-3 py-1.5">
            <span className="flex h-5 w-5 items-center justify-center text-sky-600" aria-hidden="true">
              <School className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span className="text-xs font-medium tracking-wide text-sky-700">Études en France</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Formations en France{' '}
            <span className="text-sky-600">à portée de main</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 sm:text-base">
            Découvrez toutes les opportunités de formation qui s'offrent à vous
          </p>
        </div>

        {/* Grille des formations */}
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:mt-12 lg:gap-6">
          {formationsData.map((formation, index) => (
            <div
              key={formation.id}
              className={`group rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-sky-200 hover:shadow-md ${
                isVisible ? 'opacity-100' : 'opacity-0'
              } transition-opacity duration-700 ease-out delay-${(index + 1) * 100}`}
            >
              {/* En-tête de la carte */}
              <div className="border-b border-slate-100 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition-colors duration-200 group-hover:bg-sky-100">
                    {formation.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">{formation.title}</h3>
                    <p className="text-sm text-slate-500">{formation.description}</p>
                  </div>
                </div>
              </div>

              {/* Corps de la carte */}
              <div className="p-5 space-y-3">
                {formation.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-3 transition-colors duration-200 hover:border-sky-100 hover:bg-sky-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sky-500">{item.icon}</span>
                      <span className="text-sm font-medium text-slate-700">{item.label}</span>
                    </div>
                    {item.price && (
                      <span className="flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                        <Euro className="h-3 w-3" strokeWidth={1.8} />
                        {item.price}
                      </span>
                    )}
                    {item.period && (
                      <span className="flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                        <Calendar className="h-3 w-3" strokeWidth={1.8} />
                        {item.period}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Pied de carte */}
              <div className="border-t border-slate-100 px-5 py-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600">
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Formation reconnue par l'État
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FrenchSchool;