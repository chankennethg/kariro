import { z } from 'zod';

export const ResumeGapRequestSchema = z.object({
  applicationId: z.string().uuid(),
});
export type ResumeGapRequest = z.infer<typeof ResumeGapRequestSchema>;

export const ResumeGapResultSchema = z.object({
  matchedSkills: z.array(
    z.object({
      skill: z.string(),
      evidenceFromResume: z.string(),
    }),
  ),
  missingSkills: z.array(
    z.object({
      skill: z.string(),
      importance: z.enum(['required', 'nice-to-have']),
      suggestion: z.string(),
    }),
  ),
  overallMatch: z.number().int().min(0).max(100),
  resumeSuggestions: z.array(z.string()),
  talkingPoints: z.array(z.string()),
});
export type ResumeGapResult = z.infer<typeof ResumeGapResultSchema>;

export const ResumeGapResponseSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid(),
  content: ResumeGapResultSchema,
  createdAt: z.string().datetime(),
});
export type ResumeGapResponse = z.infer<typeof ResumeGapResponseSchema>;
