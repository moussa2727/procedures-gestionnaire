import { AbsenceType, TimeSlot } from './enums';

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

export interface UnavailabilityResponse {
  id: string;
  consultantId: string;
  startDate: string;
  endDate: string;
  type: AbsenceType;
  reason?: string | null;
  createdBy: string;
  createdAt: string;
}

export interface CreateUnavailabilityPayload {
  startDate: string;
  endDate: string;
  type: AbsenceType;
  reason?: string;
}
