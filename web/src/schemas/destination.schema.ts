import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const imageFileSchema = z
  .instanceof(File)
  .refine((f) => f.size <= MAX_FILE_SIZE, 'Image trop volumineuse (max 5 Mo)')
  .refine((f) => ACCEPTED_TYPES.includes(f.type), 'Format non supporté');

export const createDestinationSchema = z.object({
  country: z.string().min(1),
  description: z.string().min(1),
  consultantIds: z.array(z.string()).min(1),
  imageFile: imageFileSchema,
});
export type CreateDestinationFormValues = z.infer<typeof createDestinationSchema>;

export const updateDestinationSchema = z.object({
  country: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  imageFile: imageFileSchema.optional(),
});
export type UpdateDestinationFormValues = z.infer<typeof updateDestinationSchema>;
