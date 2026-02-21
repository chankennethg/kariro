import { z } from 'zod';
import { CoverLetterResultSchema } from './cover-letter.js';
import { InterviewPrepResultSchema } from './interview-prep.js';
import { ResumeGapResultSchema } from './resume-gap.js';

// --- Analysis statuses ---

export const analysisStatuses = ['processing', 'completed', 'failed'] as const;
export type AnalysisStatus = (typeof analysisStatuses)[number];
export const AnalysisStatusSchema = z.enum(analysisStatuses);

// --- Request: analyze job ---
// Note: "at least one of jobDescription/jobUrl" is validated in the route handler
// (not via .refine()) to keep the schema compatible with OpenAPI spec generation.

export const AnalyzeJobRequestSchema = z.object({
  jobDescription: z.string().max(50000).optional(),
  jobUrl: z.string().url().max(2048).optional(),
  applicationId: z.string().uuid().optional(),
  autoCreateApplication: z.boolean().optional().default(false),
});
export type AnalyzeJobRequest = z.infer<typeof AnalyzeJobRequestSchema>;

// --- Structured AI output (used as generateObject() schema + response validation) ---

export const JobAnalysisResultSchema = z.object({
  companyName: z.string(),
  roleTitle: z.string(),
  location: z.string().nullable(),
  workMode: z.enum(['remote', 'hybrid', 'onsite']).nullable(),
  salaryRange: z
    .object({
      min: z.number(),
      max: z.number(),
      currency: z.string(),
    })
    .nullable(),
  requiredSkills: z.array(z.string()),
  niceToHaveSkills: z.array(z.string()),
  experienceLevel: z.enum(['junior', 'mid', 'senior', 'lead', 'principal']),
  keyResponsibilities: z.array(z.string()),
  redFlags: z.array(z.string()),
  fitScore: z.number().int().min(0).max(100),
  fitExplanation: z.string(),
  missingSkills: z.array(z.string()),
  summary: z.string(),
});
export type JobAnalysisResult = z.infer<typeof JobAnalysisResultSchema>;

// --- Response: analysis record (what GET /ai/jobs/:jobId returns) ---

export const AiAnalysisSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  applicationId: z.string().uuid().nullable(),
  jobId: z.string(),
  type: z.string(),
  status: AnalysisStatusSchema,
  result: z.union([JobAnalysisResultSchema, CoverLetterResultSchema, InterviewPrepResultSchema, ResumeGapResultSchema]).nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AiAnalysis = z.infer<typeof AiAnalysisSchema>;

// --- Response: job analysis for a specific application ---

export const JobAnalysisForApplicationSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid().nullable(),
  jobId: z.string(),
  content: JobAnalysisResultSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type JobAnalysisForApplication = z.infer<typeof JobAnalysisForApplicationSchema>;

// --- Response: enqueue confirmation ---

export const EnqueuedJobSchema = z.object({
  jobId: z.string(),
  status: z.literal('processing'),
});
export type EnqueuedJob = z.infer<typeof EnqueuedJobSchema>;
