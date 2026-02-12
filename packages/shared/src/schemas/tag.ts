import { z } from 'zod';

export const TagSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  color: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Tag = z.infer<typeof TagSchema>;

export const CreateTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a hex color code like #3B82F6')
    .optional(),
});
export type CreateTag = z.infer<typeof CreateTagSchema>;

export const AttachTagsSchema = z.object({
  tagIds: z.array(z.string().uuid()).min(1),
});
export type AttachTags = z.infer<typeof AttachTagsSchema>;
