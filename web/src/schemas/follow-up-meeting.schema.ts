import { z } from 'zod';
import { TimeSlot } from '@/src/types/enums';

export const createFollowUpMeetingSchema = z.object({
  procedureId: z.string().min(1),
  date: z.string().min(1),
  time: z.nativeEnum(TimeSlot),
  reason: z.string().optional(),
});
export type CreateFollowUpMeetingFormValues = z.infer<typeof createFollowUpMeetingSchema>;

export const rescheduleFollowUpMeetingSchema = z.object({
  date: z.string().min(1),
  time: z.nativeEnum(TimeSlot),
});
export type RescheduleFollowUpMeetingFormValues = z.infer<typeof rescheduleFollowUpMeetingSchema>;
