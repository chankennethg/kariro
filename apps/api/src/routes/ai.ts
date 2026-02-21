import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import {
  AnalyzeJobRequestSchema,
  EnqueuedJobSchema,
  AiAnalysisSchema,
  CoverLetterRequestSchema,
  InterviewPrepRequestSchema,
  ResumeGapRequestSchema,
} from '@kariro/shared';
import type { AuthUser } from '@/middleware/auth.js';
import { AppError } from '@/middleware/error.js';
import * as aiService from '@/services/ai.service.js';

const app = new OpenAPIHono<{ Variables: { user: AuthUser } }>();

const ErrorResponseSchema = z.object({
  success: z.literal(false),
  data: z.null(),
  error: z.string(),
  errorCode: z.string(),
});

// ---- Analyze Job ----

const analyzeJobRoute = createRoute({
  method: 'post',
  path: '/ai/analyze-job',
  tags: ['AI'],
  summary: 'Analyze a job posting with AI',
  description: `Submit a job posting for AI-powered analysis. Provide either \`jobDescription\` (raw text) or \`jobUrl\` (URL to fetch). At least one is required.

The job is processed asynchronously via a background worker. Poll \`GET /ai/jobs/{jobId}\` for results.

**Rate limit:** 5 requests per minute. Max 10 concurrent pending analyses per user.

**URL fetching security:** Only public HTTP(S) URLs are accepted. Private IPs, cloud metadata endpoints, and redirects are blocked. Response size is capped at 1 MB. Only \`text/html\` and \`text/plain\` content types are accepted.

**Options:**
- \`applicationId\` — link the analysis to an existing job application
- \`autoCreateApplication\` — automatically create a job application from the extracted data`,
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: AnalyzeJobRequestSchema,
        },
      },
    },
  },
  responses: {
    202: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: EnqueuedJobSchema,
            error: z.null(),
          }),
        },
      },
      description: 'Analysis job enqueued for processing',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid request (missing jobDescription and jobUrl, or invalid applicationId)',
    },
    429: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Rate limit exceeded or too many pending analyses (max 10 per user)',
    },
  },
});

app.openapi(analyzeJobRoute, async (c) => {
  const userId = c.get('user').id;
  const body = c.req.valid('json');

  // Validate: at least one of jobDescription or jobUrl must be provided
  if (!body.jobDescription && !body.jobUrl) {
    throw new AppError(
      400,
      'INVALID_INPUT',
      'Either jobDescription or jobUrl must be provided',
    );
  }

  const result = await aiService.enqueueAnalyzeJob(userId, body);
  return c.json(
    {
      success: true as const,
      data: result,
      error: null,
    },
    202,
  );
});

// ---- Poll Job Status ----

const getJobStatusRoute = createRoute({
  method: 'get',
  path: '/ai/jobs/{jobId}',
  tags: ['AI'],
  summary: 'Get AI job status and result',
  description: `Poll for the status and result of an AI analysis job.

**Status values:**
- \`processing\` — job is still being processed
- \`completed\` — analysis finished; \`result\` contains the structured output
- \`failed\` — analysis failed; \`error\` contains a user-friendly message

When \`status\` is \`completed\`, the \`result\` object includes: company name, role title, location, work mode, salary range, required/nice-to-have skills, experience level, key responsibilities, red flags, fit score (0-100), fit explanation, missing skills, and a summary.

**Rate limit:** 5 requests per minute (shared with all \`/ai/*\` endpoints).`,
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      jobId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: AiAnalysisSchema,
            error: z.null(),
          }),
        },
      },
      description: 'Analysis job status and result',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Job not found',
    },
  },
});

app.openapi(getJobStatusRoute, async (c) => {
  const userId = c.get('user').id;
  const { jobId } = c.req.valid('param');
  const analysis = await aiService.getAnalysisByJobId(userId, jobId);

  // Exclude raw `input` field from response (contains user-supplied request data)
  return c.json(
    {
      success: true as const,
      data: {
        id: analysis.id,
        userId: analysis.userId,
        applicationId: analysis.applicationId,
        jobId: analysis.jobId,
        type: analysis.type,
        status: analysis.status,
        result: analysis.result as z.infer<typeof AiAnalysisSchema>['result'],
        error: analysis.error,
        createdAt: analysis.createdAt.toISOString(),
        updatedAt: analysis.updatedAt.toISOString(),
      },
      error: null,
    },
    200,
  );
});

// ---- Generate Cover Letter ----

const coverLetterRoute = createRoute({
  method: 'post',
  path: '/ai/cover-letter',
  tags: ['AI'],
  summary: 'Generate a cover letter for a job application',
  description: `Generate a tailored cover letter for the specified job application using AI.

The application must have a \`jobDescription\`. Supports three tones:
- \`formal\` — professional language, no contractions, structured paragraphs
- \`conversational\` — warm and approachable, first-person voice
- \`confident\` — assertive, quantified achievements, strong action verbs

Processing is asynchronous — poll \`GET /ai/jobs/{jobId}\` for results.

**Rate limit:** 5 requests per minute. Max 10 concurrent pending jobs per user.`,
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CoverLetterRequestSchema,
        },
      },
    },
  },
  responses: {
    202: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: EnqueuedJobSchema,
            error: z.null(),
          }),
        },
      },
      description: 'Cover letter job enqueued for processing',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Application has no job description',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Application not found',
    },
    429: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Rate limit exceeded or too many pending jobs (max 10 per user)',
    },
  },
});

app.openapi(coverLetterRoute, async (c) => {
  const userId = c.get('user').id;
  const body = c.req.valid('json');
  const result = await aiService.enqueueCoverLetterJob(userId, body);
  return c.json(
    {
      success: true as const,
      data: result,
      error: null,
    },
    202,
  );
});

// ---- Generate Interview Prep ----

const interviewPrepRoute = createRoute({
  method: 'post',
  path: '/ai/interview-prep',
  tags: ['AI'],
  summary: 'Generate interview preparation materials for a job application',
  description: `Generate personalized technical and behavioral interview questions, company research tips, suggested questions to ask, and a preparation checklist for the specified job application.

The application must have a \`jobDescription\`. Processing is asynchronous — poll \`GET /ai/jobs/{jobId}\` for results.

**Rate limit:** 5 requests per minute. Max 10 concurrent pending jobs per user.`,
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: InterviewPrepRequestSchema,
        },
      },
    },
  },
  responses: {
    202: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: EnqueuedJobSchema,
            error: z.null(),
          }),
        },
      },
      description: 'Interview prep job enqueued for processing',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Application has no job description',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Application not found',
    },
    429: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Rate limit exceeded or too many pending jobs (max 10 per user)',
    },
  },
});

app.openapi(interviewPrepRoute, async (c) => {
  const userId = c.get('user').id;
  const body = c.req.valid('json');
  const result = await aiService.enqueueInterviewPrepJob(userId, body);
  return c.json(
    {
      success: true as const,
      data: result,
      error: null,
    },
    202,
  );
});

// ---- Generate Resume Gap Analysis ----

const resumeGapRoute = createRoute({
  method: 'post',
  path: '/ai/resume-gap',
  tags: ['AI'],
  summary: 'Analyze resume gaps for a job application',
  description: `Compare the candidate's profile against the job requirements to identify matched skills, missing skills, overall fit percentage, resume improvement suggestions, and talking points.

The application must have a \`jobDescription\`. Processing is asynchronous — poll \`GET /ai/jobs/{jobId}\` for results.

**Rate limit:** 5 requests per minute. Max 10 concurrent pending jobs per user.`,
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ResumeGapRequestSchema,
        },
      },
    },
  },
  responses: {
    202: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: EnqueuedJobSchema,
            error: z.null(),
          }),
        },
      },
      description: 'Resume gap analysis job enqueued for processing',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Application has no job description',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Application not found',
    },
    429: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Rate limit exceeded or too many pending jobs (max 10 per user)',
    },
  },
});

app.openapi(resumeGapRoute, async (c) => {
  const userId = c.get('user').id;
  const body = c.req.valid('json');
  const result = await aiService.enqueueResumeGapJob(userId, body);
  return c.json(
    {
      success: true as const,
      data: result,
      error: null,
    },
    202,
  );
});

export default app;
