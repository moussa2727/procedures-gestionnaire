// src/components/destinations/Destinations.tsx
'use client';

import { useDestinations } from '@/src/hooks/use-destinations';
import Link from 'next/link';
import { useState } from 'react';
import type { DestinationResponse } from '@/src/types/destination';

const FALLBACK_IMAGE = '/images/paname-consulting.png';

interface DestinationCardProps {
  destination: DestinationResponse;
}

const DestinationCard = ({ destination }: DestinationCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const text = destination.description;
  const isLong = text?.length > 120;
  const displayText = expanded || !isLong ? text : text?.slice(0, 120) + '…';

  const getImageSrc = (): string => {
    if (imgError) return FALLBACK_IMAGE;

    if (destination.photo && destination.photo.startsWith('http')) {
      return destination.photo;
    }

    if (destination.photo && destination.photo.startsWith('/images/')) {
      return destination.photo;
    }

    const countryImageMap: Record<string, string> = {
      Russie: '/images/russie.png',
      Chine: '/images/chine.jpg',
      Maroc: '/images/maroc.webp',
      Algérie: '/images/algerie.png',
      Turquie: '/images/turquie.webp',
      France: '/images/france.svg',
    };

    return countryImageMap[destination.country] || FALLBACK_IMAGE;
  };

  const imageSrc = getImageSrc();

  return (
    <div className="group relative flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100 hover:-translate-y-1">
      <div className="relative h-52 overflow-hidden bg-slate-200">
        <img
          src={imageSrc}
          alt={destination.country}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-slate-900/60" />
        <div className="absolute bottom-3 left-4">
          <span className="bg-white/95 backdrop-blur-sm text-slate-800 text-sm font-bold px-3 py-1 rounded-full shadow-md tracking-wide">
            {destination.country}
          </span>
        </div>
        <div className="absolute top-0 left-0 right-0 h-1 bg-sky-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
      </div>

      <div className="flex flex-col flex-1 p-5 gap-3">
        <div className="text-slate-600 text-sm leading-relaxed">
          {displayText}
          {isLong && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExpanded((prev) => !prev);
              }}
              className="ml-1 text-sky-500 hover:text-sky-700 font-medium text-sm transition-colors"
            >
              {expanded ? 'Voir moins' : 'Voir plus'}
            </button>
          )}
        </div>

        <div className="mt-auto pt-3 border-t border-slate-100">
          <Link
            href={`/rendez-vous?destinationId=${destination.id}`}
            className="flex items-center justify-between w-full group/btn"
          >
            <span className="text-sm font-semibold text-slate-700 group-hover/btn:text-sky-600 transition-colors">
              Prendre rendez-vous
            </span>
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-50 group-hover/btn:bg-sky-500 transition-all duration-300">
              <svg
                className="w-4 h-4 text-sky-500 group-hover/btn:text-white transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

const Destinations = () => {
  const { data: destinations, isLoading } = useDestinations();

  const destinationsArray: DestinationResponse[] = Array.isArray(destinations) ? destinations : [];

  if (isLoading) {
    return (
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-sky-500 text-sm font-semibold tracking-widest uppercase mb-3">
              Nos destinations
            </span>
            <h2 className="text-4xl font-extrabold text-slate-900 leading-tight">
              Où souhaitez-vous{' '}
              <span className="text-sky-600">
                étudier ?
              </span>
            </h2>
            <p className="mt-4 text-slate-500 text-base max-w-xl mx-auto leading-relaxed">
              Choisissez votre destination et laissez-nous vous accompagner dans votre projet
              d'études à l'étranger.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100"
              >
                <div className="h-52 bg-slate-200 animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-slate-200 rounded w-full animate-pulse" />
                  <div className="h-4 bg-slate-200 rounded w-5/6 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-sky-500 text-sm font-semibold tracking-widest uppercase mb-3">
            Nos destinations
          </span>
          <h2 className="text-4xl font-extrabold text-slate-900 leading-tight">
            Où souhaitez-vous{' '}
            <span className="text-sky-600">
              étudier ?
            </span>
          </h2>
          <p className="mt-4 text-slate-500 text-base max-w-xl mx-auto leading-relaxed">
            Choisissez votre destination et laissez-nous vous accompagner dans votre projet d'études
            à l'étranger.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {destinationsArray.map((dest) => (
            <DestinationCard key={dest.id} destination={dest} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Destinations;