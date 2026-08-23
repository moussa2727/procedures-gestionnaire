'use client';
import { useQuery } from '@tanstack/react-query';
import { availabilityService } from '../services/availability.service';
import { TimeSlot } from '../types/enums';

export const availabilityKeys = {
  all: ['availability'] as const,
  day: (d: string, date: string, c?: string) =>
    [...availabilityKeys.all, 'day', d, date, c ?? 'any'] as const,
  range: (d: string, s: string, e: string, c?: string) =>
    [...availabilityKeys.all, 'range', d, s, e, c ?? 'any'] as const,
  slots: (d: string, date: string, c?: string) =>
    [...availabilityKeys.all, 'slots', d, date, c ?? 'any'] as const,
  check: (c: string, d: string, date: string, t?: string) =>
    [...availabilityKeys.all, 'check', c, d, date, t ?? 'none'] as const,
};

export function useDayAvailability(destinationId: string, date: string, consultantId?: string) {
  return useQuery({
    queryKey: availabilityKeys.day(destinationId, date, consultantId),
    queryFn: () => availabilityService.getDayAvailability(destinationId, date, consultantId),
    enabled: !!destinationId && !!date,
    staleTime: 15_000,
  });
}

export function useAvailabilityRange(
  destinationId: string,
  startDate: string,
  endDate: string,
  consultantId?: string,
) {
  return useQuery({
    queryKey: availabilityKeys.range(destinationId, startDate, endDate, consultantId),
    queryFn: () =>
      availabilityService.getAvailabilityRange(destinationId, startDate, endDate, consultantId),
    enabled: !!destinationId && !!startDate && !!endDate,
    staleTime: 15_000,
  });
}

export function useAvailableSlots(destinationId: string, date: string, consultantId?: string) {
  return useQuery({
    queryKey: availabilityKeys.slots(destinationId, date, consultantId),
    queryFn: () => availabilityService.getAvailableSlots(destinationId, date, consultantId),
    enabled: !!destinationId && !!date,
    staleTime: 15_000,
  });
}

export function useCheckSlot(
  consultantId: string,
  destinationId: string,
  date: string,
  time?: TimeSlot,
) {
  return useQuery({
    queryKey: availabilityKeys.check(consultantId, destinationId, date, time),
    queryFn: () =>
      availabilityService.checkSlot(consultantId, destinationId, date, time as TimeSlot),
    enabled: !!consultantId && !!destinationId && !!date && !!time,
    staleTime: 5_000,
  });
}
