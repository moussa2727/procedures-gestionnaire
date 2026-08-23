// src/components/home/Valeurs.tsx
'use client';

import { Heart, Lightbulb, ShieldCheck, Sparkles } from 'lucide-react';

function Valeurs() {
  return (
    <section className="w-full bg-sky-50/30 py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1.5">
            <span className="flex h-5 w-5 items-center justify-center text-sky-600" aria-hidden="true">
              <Heart className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span className="text-xs font-medium tracking-wide text-sky-700">Nos Valeurs</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Des principes qui <span className="text-sky-600">guident nos actions</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-500 sm:text-base">
            Des valeurs fondamentales qui façonnent notre avenir et notre relation avec vous.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:mt-12 lg:grid-cols-4 lg:gap-6">
          {/* Passion */}
          <div className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-sky-200 hover:shadow-md">
            <div className="flex flex-col items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition-colors duration-200 group-hover:bg-sky-100">
                <Heart className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-800">Passion</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                Nous sommes animés par une passion profonde pour ce que nous faisons.
              </p>
            </div>
          </div>

          {/* Innovation */}
          <div className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-sky-200 hover:shadow-md">
            <div className="flex flex-col items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition-colors duration-200 group-hover:bg-sky-100">
                <Lightbulb className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-800">Innovation</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                Nous recherchons constamment de nouvelles idées et des solutions créatives.
              </p>
            </div>
          </div>

          {/* Intégrité */}
          <div className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-sky-200 hover:shadow-md">
            <div className="flex flex-col items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition-colors duration-200 group-hover:bg-sky-100">
                <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-800">Intégrité</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                Nous agissons avec honnêteté, transparence et éthique.
              </p>
            </div>
          </div>

          {/* Excellence */}
          <div className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-sky-200 hover:shadow-md">
            <div className="flex flex-col items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition-colors duration-200 group-hover:bg-sky-100">
                <Sparkles className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-800">Excellence</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                Nous nous engageons à atteindre les plus hauts standards de qualité.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Valeurs;