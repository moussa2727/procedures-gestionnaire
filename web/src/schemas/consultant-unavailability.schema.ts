import { z } from 'zod';
import { AbsenceType } from '@/src/types/enums';

export const createUnavailabilitySchema = z
  .object({
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    type: z.nativeEnum(AbsenceType),
    reason: z.string().optional(),
  })
  .refine((d) => new Date(d.startDate) <= new Date(d.endDate), {
    message: 'La date de début doit précéder la date de fin',
    path: ['endDate'],
  });

export type CreateUnavailabilityFormValues = z.infer<typeof createUnavailabilitySchema>;
