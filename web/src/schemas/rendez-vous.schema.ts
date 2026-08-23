import { z } from 'zod';
import { TimeSlot } from '@/src/types/enums';

export const createRendezVousSchema = z.object({
  consultantId: z.string().min(1),
  destinationId: z.string().min(1),
  date: z.string().min(1, 'La date est requise'),
  time: z.nativeEnum(TimeSlot),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  sector: z.string().min(1),
  studyLevel: z.string().min(1),
});
export type CreateRendezVousFormValues = z.infer<typeof createRendezVousSchema>;

export const rescheduleRendezVousSchema = z.object({
  date: z.string().min(1),
  time: z.nativeEnum(TimeSlot),
});
export type RescheduleRendezVousFormValues = z.infer<typeof rescheduleRendezVousSchema>;

export const cancelRendezVousSchema = z.object({
  reason: z.string().optional(),
});
export type CancelRendezVousFormValues = z.infer<typeof cancelRendezVousSchema>;
