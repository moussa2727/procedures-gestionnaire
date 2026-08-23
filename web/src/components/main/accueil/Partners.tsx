// src/components/home/Partners.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { MapPin, ExternalLink, CheckCircle, Building2 } from 'lucide-react';

interface Partner {
  id: number;
  name: string;
  location: string;
  image: any;
  link: string;
  alt: string;
}

// Images des partenaires (à ajuster selon vos imports)
import Supemir from '@/public/images/supemir.webp';
import Ecolemultimedia from '@/public/images/Ecolemultimediafrance.webp';
import InternationalInstitute from '@/public/images/internationalinstitute.png';
import UniversiteChongqing from '@/public/images/universitechiongqing.png';
import Hecf from '@/public/images/hecf.webp';
import SupManagement from '@/public/images/supmanagement.webp';
import FranceSucces from '@/public/images/francesucces.webp';
import Inted from '@/public/images/inted.webp';

const PartnerCard = ({ partner, index }: { partner: Partner; index: number }) => {
  return (
    <motion.a
      href={partner.link}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{
        y: -4,
        transition: { duration: 0.2 },
      }}
      className="group relative flex flex-col items-center rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-sky-200"
    >
      {/* Badge vérifié */}
      <div className="absolute left-3 top-3">
        <CheckCircle className="h-4 w-4 text-emerald-500" strokeWidth={2} />
      </div>

      {/* Icône externe au hover */}
      <div className="absolute right-3 top-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <ExternalLink className="h-4 w-4 text-sky-500" strokeWidth={1.8} />
      </div>

      {/* Logo */}
      <div className="relative h-20 w-20 shrink-0">
        <Image
          src={partner.image}
          alt={partner.alt}
          fill
          className="object-contain p-1"
          quality={85}
          sizes="80px"
        />
      </div>

      {/* Nom */}
      <p className="mt-3 text-center text-sm font-medium text-slate-800 line-clamp-2">
        {partner.name}
      </p>

      {/* Localisation */}
      <div className="mt-1 flex items-center gap-1">
        <MapPin className="h-3 w-3 text-slate-400" strokeWidth={1.8} />
        <p className="text-xs text-slate-400">{partner.location}</p>
      </div>
    </motion.a>
  );
};

const Partners: React.FC = () => {
  const [visibleCount, setVisibleCount] = useState(8);

  const partners: Partner[] = [
    {
      id: 1,
      name: 'Supemir',
      location: 'Casablanca, Maroc',
      image: Supemir,
      link: 'https://www.supemir.com/',
      alt: 'Supemir - École supérieure à Casablanca, Maroc',
    },
    {
      id: 2,
      name: "L'École Multimédia",
      location: 'Paris, France',
      image: Ecolemultimedia,
      link: 'https://www.ecole-multimedia.com/',
      alt: "L'École Multimédia - Paris, France",
    },
    {
      id: 3,
      name: 'International Institute Ford Ghana',
      location: 'Accra, Ghana',
      image: InternationalInstitute,
      link: 'https://visionfordgh.com/',
      alt: 'International Institute Ford Ghana - Accra, Ghana',
    },
    {
      id: 4,
      name: 'Université de Chongqing',
      location: 'Chongqing, Chine',
      image: UniversiteChongqing,
      link: 'https://english.cqu.edu.cn/',
      alt: 'Université de Chongqing - Chongqing, Chine',
    },
    {
      id: 5,
      name: 'HECF',
      location: 'Fès, Maroc',
      image: Hecf,
      link: 'https://hecf.ac.ma/',
      alt: 'HECF - Haute École de Commerce et de Finance, Fès, Maroc',
    },
    {
      id: 6,
      name: "SUP'MANAGEMENT",
      location: 'Fès, Maroc',
      image: SupManagement,
      link: 'https://www.supmanagement.ma/',
      alt: "SUP'MANAGEMENT - Fès, Maroc",
    },
    {
      id: 7,
      name: 'Univers France Succès',
      location: 'Sarcelles, France',
      image: FranceSucces,
      link: 'https://universfrancesucces.com/',
      alt: 'Univers France Succès - Sarcelles, France',
    },
    {
      id: 8,
      name: 'Inted Group',
      location: 'Paris, France',
      image: Inted,
      link: 'https://www.intedgroup.com/',
      alt: 'Inted Group - Paris, France',
    },
  ];

  useEffect(() => {
    const updateVisibleCount = () => {
      if (window.innerWidth < 640) setVisibleCount(4);
      else if (window.innerWidth < 768) setVisibleCount(6);
      else setVisibleCount(8);
    };

    updateVisibleCount();
    window.addEventListener('resize', updateVisibleCount);
    return () => window.removeEventListener('resize', updateVisibleCount);
  }, []);

  const visiblePartners = partners.slice(0, visibleCount);

  return (
    <section className="w-full border-b border-slate-100 bg-white py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            <span className="flex h-5 w-5 items-center justify-center text-sky-600" aria-hidden="true">
              <Building2 className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span className="text-xs font-medium tracking-wide text-slate-500">Nos Partenaires</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Ils nous font confiance <span className="text-sky-600">à travers le monde</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-500 sm:text-base">
            Des partenariats stratégiques avec les leaders de l'éducation et de l'innovation.
          </p>
        </div>

        {/* Grille des partenaires */}
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:mt-12 lg:grid-cols-4 lg:gap-6">
          {visiblePartners.map((partner, index) => (
            <PartnerCard key={partner.id} partner={partner} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Partners;