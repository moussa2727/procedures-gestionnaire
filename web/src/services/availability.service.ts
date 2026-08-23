import { apiClient } from '@/src/lib/api-client';
import type { DayAvailability, SlotAvailabilityResult } from '@/src/types/availability';
import type { TimeSlot } from '@/src/types/enums';

export const availabilityService = {
  getDayAvailability: async (destinationId: string, date: string, consultantId?: string) =>
    (await apiClient.get<DayAvailability>('/availability/day', { params: { destinationId, date, consultantId } })).data,
  getAvailabilityRange: async (destinationId: string, startDate: string, endDate: string, consultantId?: string) =>
    (await apiClient.get<DayAvailability[]>('/availability/range', { params: { destinationId, startDate, endDate, consultantId } })).data,
  getAvailableSlots: async (destinationId: string, date: string, consultantId?: string) =>
    (await apiClient.get<TimeSlot[]>('/availability/slots', { params: { destinationId, date, consultantId } })).data,
  checkSlot: async (consultantId: string, destinationId: string, date: string, time: TimeSlot) =>
    (await apiClient.get<SlotAvailabilityResult>('/availability/check', { params: { consultantId, destinationId, date, time } })).data,
};
