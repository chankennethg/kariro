import { z } from 'zod';

export const InterviewPrepRequestSchema = z.object({
  applicationId: z.string().uuid(),
});
export type InterviewPrepRequest = z.infer<typeof InterviewPrepRequestSchema>;

export const InterviewPrepResultSchema = z.object({
  technicalQuestions: z.array(
    z.object({
      question: z.string(),
      suggestedAnswer: z.string(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
    }),
  ),
  behavioralQuestions: z.array(
    z.object({
      question: z.string(),
      suggestedAnswer: z.string(),
      tip: z.string(),
    }),
  ),
  companyResearchTips: z.array(z.string()),
  questionsToAsk: z.array(z.string()),
  preparationChecklist: z.array(z.string()),
});
export type InterviewPrepResult = z.infer<typeof InterviewPrepResultSchema>;

export const InterviewPrepResponseSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid(),
  content: InterviewPrepResultSchema,
  createdAt: z.string().datetime(),
});
export type InterviewPrepResponse = z.infer<typeof InterviewPrepResponseSchema>;
