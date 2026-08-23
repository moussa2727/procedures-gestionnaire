// src/constants/app-options.ts

export const STUDY_LEVEL_OPTIONS = [
  { value: 'Baccalauréat / Terminale', label: 'Baccalauréat / Terminale' },
  { value: 'Bac +1 (L1, Prépa 1, BTS 1)', label: 'Bac +1 (L1, Prépa 1, BTS 1)' },
  { value: 'Bac +2 (L2, Prépa 2, BTS 2, BUT)', label: 'Bac +2 (L2, Prépa 2, BTS 2, BUT)' },
  { value: 'Licence / Bachelor (Bac +3)', label: 'Licence / Bachelor (Bac +3)' },
  { value: 'Master 1 (Bac +4)', label: 'Master 1 (Bac +4)' },
  { value: 'Master 2 / Ingénieur / MBA (Bac +5)', label: 'Master 2 / Ingénieur / MBA (Bac +5)' },
  { value: 'Doctorat / PhD (Bac +8)', label: 'Doctorat / PhD (Bac +8)' },
  { value: 'Professionnel en reconversion', label: 'Professionnel en reconversion' },
];

export const SECTOR_OPTIONS = [
  { value: 'Commerce / Marketing', label: 'Commerce / Marketing' },
  { value: 'Finance / Comptabilité', label: 'Finance / Comptabilité' },
  { value: 'Ingénierie / Technologie', label: 'Ingénierie / Technologie' },
  { value: 'Sciences / Recherche', label: 'Sciences / Recherche' },
  { value: 'Droit / Sciences politiques', label: 'Droit / Sciences politiques' },
  { value: 'Médecine / Santé', label: 'Médecine / Santé' },
  { value: 'Lettres / Langues', label: 'Lettres / Langues' },
  { value: 'Arts / Design', label: 'Arts / Design' },
  { value: 'Informatique / Data', label: 'Informatique / Data' },
  { value: 'Management / RH', label: 'Management / RH' },
];

export const STATUS_CONFIG = {
  CONFIRMED: { color: 'text-sky-600 bg-sky-50 border-sky-200', label: 'Confirmé' },
  PENDING: { color: 'text-amber-600 bg-amber-50 border-amber-200', label: 'En attente' },
  COMPLETED: { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', label: 'Terminé' },
  CANCELLED: { color: 'text-red-600 bg-red-50 border-red-200', label: 'Annulé' },
};