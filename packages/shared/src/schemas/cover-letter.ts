import { z } from 'zod';

export const tones = ['formal', 'conversational', 'confident'] as const;
export type CoverLetterTone = (typeof tones)[number];

export const CoverLetterRequestSchema = z.object({
  applicationId: z.string().uuid(),
  tone: z.enum(tones),
});
export type CoverLetterRequest = z.infer<typeof CoverLetterRequestSchema>;

export const CoverLetterResultSchema = z.object({
  content: z.string(),
  tone: z.enum(tones),
  applicationId: z.string().uuid(),
});
export type CoverLetterResult = z.infer<typeof CoverLetterResultSchema>;

export const CoverLetterSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid(),
  userId: z.string().uuid(),
  tone: z.enum(tones),
  content: z.string(),
  createdAt: z.string().datetime(),
});
export type CoverLetter = z.infer<typeof CoverLetterSchema>;
