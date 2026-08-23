import { TimeSlot } from '@prisma/client';

export interface DayAvailability {
  date: string;
  dayOfWeek: string;
  isWorkable: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  hasAvailableSlots: boolean;
  availableSlots: TimeSlot[];
}

export interface SlotConflict {
  type: 'RENDEZ_VOUS' | 'FOLLOW_UP_MEETING' | 'BOOKING_ORPHAN';
  id: string;
  bookingId: string;
}

export interface SlotAvailabilityResult {
  available: boolean;
  reason?: string;
  conflict?: SlotConflict;
}

export interface DisponibiliteCheckInput {
  consultantId: string;
  destinationId: string;
  date: Date;
  time: TimeSlot;
  // Lors d'une réplanification, exclut le booking actuellement occupé par
  // la ressource en cours de déplacement pour ne pas se bloquer soi-même.
  excludeBookingId?: string;
}

export interface AvailableSlotsForDayInput {
  consultantId?: string;
  destinationId: string;
  date: Date;
}
