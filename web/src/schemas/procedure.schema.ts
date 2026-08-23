import { z } from 'zod';
import { StepStatus } from '@/src/types/enums';

export const createProcedureSchema = z.object({
  rendezVousId: z.string().min(1),
  stepNames: z.array(z.string().min(1)).min(1, 'Au moins une étape doit être définie'),
});
export type CreateProcedureFormValues = z.infer<typeof createProcedureSchema>;

export const updateStepSchema = z
  .object({
    status: z.nativeEnum(StepStatus),
    rejectionReason: z.string().optional(),
  })
  .refine((data) => data.status !== StepStatus.REJECTED || !!data.rejectionReason, {
    message: 'Un motif de rejet est obligatoire',
    path: ['rejectionReason'],
  });
export type UpdateStepFormValues = z.infer<typeof updateStepSchema>;

export const rejectProcedureSchema = z.object({
  reason: z.string().min(1, 'Le motif est requis'),
});
export type RejectProcedureFormValues = z.infer<typeof rejectProcedureSchema>;

export const cancelProcedureSchema = z.object({
  reason: z.string().min(1, 'Le motif est requis'),
});
export type CancelProcedureFormValues = z.infer<typeof cancelProcedureSchema>;

export const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});
export type CreateCommentFormValues = z.infer<typeof createCommentSchema>;
