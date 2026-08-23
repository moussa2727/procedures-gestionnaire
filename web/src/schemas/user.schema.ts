import { z } from 'zod';
import { UserRole } from '@/src/types/enums';

export const createUserSchema = z.object({
  email: z.string().email().max(100),
  password: z.string().min(8).max(255),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().max(20).optional(),
  role: z.enum([UserRole.CONSULTANT, UserRole.ETUDIANT]),
  isActive: z.boolean().optional(),
});
export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const updateProfileSchema = z.object({
  email: z.string().email().max(100).optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().max(20).optional(),
});
export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;

export const createReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
  })
  .refine((data) => data.rating > 2 || (data.comment && data.comment.length > 0), {
    message: 'Un commentaire est obligatoire pour une evaluation de 2 etoiles ou moins',
    path: ['comment'],
  });
export type CreateReviewFormValues = z.infer<typeof createReviewSchema>;

export const respondReviewSchema = z.object({
  response: z.string().min(1).max(1000),
});
export type RespondReviewFormValues = z.infer<typeof respondReviewSchema>;
