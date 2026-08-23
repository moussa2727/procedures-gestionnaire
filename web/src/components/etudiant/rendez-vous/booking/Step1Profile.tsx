'use client';

import React from 'react';
import { User, Mail, Phone, GraduationCap, AlertCircle } from 'lucide-react';
import { useFormContext, Controller } from 'react-hook-form';
import type { CreateRendezVousFormValues } from '@/src/schemas/rendez-vous.schema';

const STUDY_LEVEL_OPTIONS = [
  { value: 'Baccalaureat / Terminale', label: 'Baccalaureat / Terminale' },
  { value: 'Bac +1 (L1, PrepA 1, BTS 1)', label: 'Bac +1 (L1, PrepA 1, BTS 1)' },
  { value: 'Bac +2 (L2, PrepA 2, BTS 2, BUT)', label: 'Bac +2 (L2, PrepA 2, BTS 2, BUT)' },
  { value: 'Licence / Bachelor (Bac +3)', label: 'Licence / Bachelor (Bac +3)' },
  { value: 'Master 1 (Bac +4)', label: 'Master 1 (Bac +4)' },
  { value: 'Master 2 / Ingenieur / MBA (Bac +5)', label: 'Master 2 / Ingenieur / MBA (Bac +5)' },
  { value: 'Doctorat / PhD (Bac +8)', label: 'Doctorat / PhD (Bac +8)' },
  { value: 'Professionnel en reconversion', label: 'Professionnel en reconversion' },
];

const SECTOR_OPTIONS = [
  { value: 'Commerce / Marketing', label: 'Commerce / Marketing' },
  { value: 'Finance / Comptabilite', label: 'Finance / Comptabilite' },
  { value: 'Ingenierie / Technologie', label: 'Ingenierie / Technologie' },
  { value: 'Sciences / Recherche', label: 'Sciences / Recherche' },
  { value: 'Droit / Sciences politiques', label: 'Droit / Sciences politiques' },
  { value: 'Medecine / Sante', label: 'Medecine / Sante' },
  { value: 'Lettres / Langues', label: 'Lettres / Langues' },
  { value: 'Arts / Design', label: 'Arts / Design' },
  { value: 'Informatique / Data', label: 'Informatique / Data' },
  { value: 'Management / RH', label: 'Management / RH' },
];

interface Step1ProfileProps {
  errors: Partial<Record<keyof CreateRendezVousFormValues, { message?: string }>>;
}

export function Step1Profile({ errors }: Step1ProfileProps) {
  const { register, formState } = useFormContext<CreateRendezVousFormValues>();
  const fieldErrors = formState.errors;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-sky-50 border border-sky-200 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-sky-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-sky-800">
            Vos informations personnelles seront pre-remplies automatiquement
          </p>
          <p className="text-[11px] text-sky-600 mt-0.5">
            Verifiez et completez les champs si necessaire
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldWrapper label="Prenom" required error={fieldErrors.firstName?.message}>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              {...register('firstName')}
              placeholder="Votre prenom"
              className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 focus:border-sky-600 transition-all hover:border-sky-300 ${
                fieldErrors.firstName ? 'border-red-300' : 'border-slate-300'
              }`}
            />
          </div>
        </FieldWrapper>

        <FieldWrapper label="Nom" required error={fieldErrors.lastName?.message}>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              {...register('lastName')}
              placeholder="Votre nom"
              className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 focus:border-sky-600 transition-all hover:border-sky-300 ${
                fieldErrors.lastName ? 'border-red-300' : 'border-slate-300'
              }`}
            />
          </div>
        </FieldWrapper>

        <FieldWrapper label="Email" required error={fieldErrors.email?.message}>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              {...register('email')}
              type="email"
              placeholder="votre@email.com"
              className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 focus:border-sky-600 transition-all hover:border-sky-300 ${
                fieldErrors.email ? 'border-red-300' : 'border-slate-300'
              }`}
            />
          </div>
        </FieldWrapper>

        <FieldWrapper label="Telephone" required error={fieldErrors.phone?.message}>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              {...register('phone')}
              placeholder="+33 6 12 34 56 78"
              className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 focus:border-sky-600 transition-all hover:border-sky-300 ${
                fieldErrors.phone ? 'border-red-300' : 'border-slate-300'
              }`}
            />
          </div>
        </FieldWrapper>

        <FieldWrapper label="Secteur d'etudes" required error={fieldErrors.sector?.message}>
          <select
            {...register('sector')}
            className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-0 focus:border-sky-600 transition-all hover:border-sky-300 appearance-none ${
              fieldErrors.sector ? 'border-red-300' : 'border-slate-300'
            }`}
          >
            <option value="">Selectionnez un secteur</option>
            {SECTOR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FieldWrapper>

        <FieldWrapper label="Niveau d'etudes" required error={fieldErrors.studyLevel?.message}>
          <div className="relative">
            <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              {...register('studyLevel')}
              className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-0 focus:border-sky-600 transition-all hover:border-sky-300 appearance-none ${
                fieldErrors.studyLevel ? 'border-red-300' : 'border-slate-300'
              }`}
            >
              <option value="">Selectionnez un niveau</option>
              {STUDY_LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </FieldWrapper>
      </div>
    </div>
  );
}

interface FieldWrapperProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

function FieldWrapper({ label, required, error, children }: FieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[11px] text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}
