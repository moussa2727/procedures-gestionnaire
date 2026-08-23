// availability/constants/availability.constants.ts
import { TimeSlot } from '@prisma/client';

// Planning de travail commun à toutes les destinations (README : "Toutes
// les destinations partagent le même planning de travail"). Rien n'est
// stocké en base — ces constantes alimentent uniquement le calcul dynamique
// d'AvailabilityService.

export const WORKING_DAYS = [1, 2, 3, 4, 5] as const; // lundi=1 ... vendredi=5, dimanche=0

// Ordre chronologique strict, aligné sur l'enum TimeSlot réel du schéma
// Prisma (12 créneaux de 30 minutes).
// Pause déjeuner 12:00 - 14:00 : aucun créneau
export const ORDERED_TIME_SLOTS: TimeSlot[] = [
  TimeSlot.SLOT_0900,
  TimeSlot.SLOT_0930,
  TimeSlot.SLOT_1000,
  TimeSlot.SLOT_1030,
  TimeSlot.SLOT_1100,
  TimeSlot.SLOT_1130,
  TimeSlot.SLOT_1400,
  TimeSlot.SLOT_1430,
  TimeSlot.SLOT_1500,
  TimeSlot.SLOT_1530,
  TimeSlot.SLOT_1600,
  TimeSlot.SLOT_1630,
];

// Correspondance créneau -> heure/minute réelles, dérivée du @map du
// schéma. Utilisée pour détecter les créneaux passés et pour l'affichage
// formaté ("09h00").
export const TIME_SLOT_CLOCK: Record<
  TimeSlot,
  { hour: number; minute: number }
> = {
  [TimeSlot.SLOT_0900]: { hour: 9, minute: 0 },
  [TimeSlot.SLOT_0930]: { hour: 9, minute: 30 },
  [TimeSlot.SLOT_1000]: { hour: 10, minute: 0 },
  [TimeSlot.SLOT_1030]: { hour: 10, minute: 30 },
  [TimeSlot.SLOT_1100]: { hour: 11, minute: 0 },
  [TimeSlot.SLOT_1130]: { hour: 11, minute: 30 },
  [TimeSlot.SLOT_1400]: { hour: 14, minute: 0 },
  [TimeSlot.SLOT_1430]: { hour: 14, minute: 30 },
  [TimeSlot.SLOT_1500]: { hour: 15, minute: 0 },
  [TimeSlot.SLOT_1530]: { hour: 15, minute: 30 },
  [TimeSlot.SLOT_1600]: { hour: 16, minute: 0 },
  [TimeSlot.SLOT_1630]: { hour: 16, minute: 30 },
};

export const HOLIDAY_COUNTRY_CODE = 'ML';
export const HOLIDAY_CACHE_YEARS_AHEAD = 5;

export const FRENCH_WEEKDAY_NAMES = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
] as const;
