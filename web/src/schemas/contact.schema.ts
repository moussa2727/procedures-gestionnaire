// src/schemas/contact.schema.ts
import { z } from 'zod';

export const createContactSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email('Email invalide').max(255),
  message: z.string().min(10, 'Le message doit contenir au moins 10 caracteres').max(5000),
  website: z.string().optional(),
});
export type CreateContactFormValues = z.infer<typeof createContactSchema>;

export const replyContactSchema = z.object({
  reply: z.string().min(10, 'La reponse doit contenir au moins 10 caracteres').max(5000),
});
export type ReplyContactFormValues = z.infer<typeof replyContactSchema>;