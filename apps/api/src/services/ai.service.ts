import crypto from 'node:crypto';
import { eq, and, sql, desc } from 'drizzle-orm';
import type {
  AnalyzeJobRequest,
  JobAnalysisResult,
  CoverLetterRequest,
  InterviewPrepRequest,
  ResumeGapRequest,
} from '@kariro/shared';
import { db } from '@/db/index.js';
import { aiAnalyses, coverLetters, interviewPreps, resumeGapAnalyses, jobApplications } from '@/db/schema/tables.js';
import { aiQueue } from '@/lib/queue.js';
import { AppError } from '@/middleware/error.js';
import * as applicationService from './application.service.js';

const MAX_PENDING_ANALYSES = 10;
const MAX_COVER_LETTERS_PER_APPLICATION = 20;
const MAX_INTERVIEW_PREPS_PER_APPLICATION = 10;
const MAX_RESUME_GAPS_PER_APPLICATION = 10;

async function enforceQueueLimit(userId: string): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiAnalyses)
    .where(and(eq(aiAnalyses.userId, userId), eq(aiAnalyses.status, 'processing')));

  if (count >= MAX_PENDING_ANALYSES) {
    throw new AppError(
      429,
      'QUEUE_LIMIT',
      'You have too many pending analyses. Please wait for some to complete.',
    );
  }
}

async function insertAndEnqueue(
  userId: string,
  applicationId: string,
  type: string,
  jobName: string,
  input: Record<string, unknown>,
): Promise<{ jobId: string; status: 'processing' }> {
  await enforceQueueLimit(userId);

  const jobId = crypto.randomUUID();

  await db.insert(aiAnalyses).values({
    userId,
    applicationId,
    jobId,
    type,
    status: 'processing',
    input,
  });

  try {
    await aiQueue.add(jobName, { userId, jobId, ...input }, {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  } catch {
    await db.delete(aiAnalyses).where(eq(aiAnalyses.jobId, jobId));
    throw new AppError(
      503,
      'QUEUE_UNAVAILABLE',
      'Job processing is temporarily unavailable. Please try again later.',
    );
  }

  return { jobId, status: 'processing' as const };
}

export async function enqueueAnalyzeJob(userId: string, data: AnalyzeJobRequest) {
  // Verify application ownership if linking to existing
  if (data.applicationId) {
    await applicationService.getApplication(userId, data.applicationId);
  }

  // Per-user queue limit to prevent queue flooding
  await enforceQueueLimit(userId);

  const jobId = crypto.randomUUID();

  // Insert tracking row first (if queue add fails, row is harmless)
  await db.insert(aiAnalyses).values({
    userId,
    applicationId: data.applicationId ?? null,
    jobId,
    type: 'analyze-job',
    status: 'processing',
    input: data as Record<string, unknown>,
  });

  // Enqueue with same jobId — clean up tracking row if queue is unavailable
  try {
    await aiQueue.add(
      'analyze-job',
      { userId, jobId, ...data },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  } catch {
    await db.delete(aiAnalyses).where(eq(aiAnalyses.jobId, jobId));
    throw new AppError(
      503,
      'QUEUE_UNAVAILABLE',
      'Job processing is temporarily unavailable. Please try again later.',
    );
  }

  return { jobId, status: 'processing' as const };
}

export async function getAnalysisByJobId(userId: string, jobId: string) {
  const [analysis] = await db
    .select()
    .from(aiAnalyses)
    .where(and(eq(aiAnalyses.jobId, jobId), eq(aiAnalyses.userId, userId)));

  if (!analysis) {
    throw new AppError(404, 'NOT_FOUND', 'Analysis job not found');
  }

  return analysis;
}

export async function enqueueCoverLetterJob(userId: string, data: CoverLetterRequest) {
  await applicationService.getApplication(userId, data.applicationId);

  const [{ letterCount }] = await db
    .select({ letterCount: sql<number>`count(*)::int` })
    .from(coverLetters)
    .where(and(eq(coverLetters.applicationId, data.applicationId), eq(coverLetters.userId, userId)));

  if (letterCount >= MAX_COVER_LETTERS_PER_APPLICATION) {
    throw new AppError(
      429,
      'COVER_LETTER_LIMIT',
      `Maximum of ${MAX_COVER_LETTERS_PER_APPLICATION} cover letters reached for this application.`,
    );
  }

  return insertAndEnqueue(userId, data.applicationId, 'generate-cover-letter', 'generate-cover-letter', {
    applicationId: data.applicationId,
    tone: data.tone,
  });
}

export async function enqueueInterviewPrepJob(userId: string, data: InterviewPrepRequest) {
  await applicationService.getApplication(userId, data.applicationId);

  const [{ prepCount }] = await db
    .select({ prepCount: sql<number>`count(*)::int` })
    .from(interviewPreps)
    .where(and(eq(interviewPreps.applicationId, data.applicationId), eq(interviewPreps.userId, userId)));

  if (prepCount >= MAX_INTERVIEW_PREPS_PER_APPLICATION) {
    throw new AppError(
      429,
      'INTERVIEW_PREP_LIMIT',
      `Maximum of ${MAX_INTERVIEW_PREPS_PER_APPLICATION} interview preps reached for this application.`,
    );
  }

  return insertAndEnqueue(userId, data.applicationId, 'interview-prep', 'interview-prep', {
    applicationId: data.applicationId,
  });
}

export async function enqueueResumeGapJob(userId: string, data: ResumeGapRequest) {
  await applicationService.getApplication(userId, data.applicationId);

  const [{ gapCount }] = await db
    .select({ gapCount: sql<number>`count(*)::int` })
    .from(resumeGapAnalyses)
    .where(and(eq(resumeGapAnalyses.applicationId, data.applicationId), eq(resumeGapAnalyses.userId, userId)));

  if (gapCount >= MAX_RESUME_GAPS_PER_APPLICATION) {
    throw new AppError(
      429,
      'RESUME_GAP_LIMIT',
      `Maximum of ${MAX_RESUME_GAPS_PER_APPLICATION} resume gap analyses reached for this application.`,
    );
  }

  return insertAndEnqueue(userId, data.applicationId, 'resume-gap', 'resume-gap', {
    applicationId: data.applicationId,
  });
}

export async function getJobAnalysisByApplicationId(userId: string, applicationId: string) {
  const [app] = await db
    .select()
    .from(jobApplications)
    .where(and(eq(jobApplications.id, applicationId), eq(jobApplications.userId, userId)));

  if (!app) {
    throw new AppError(404, 'NOT_FOUND', 'Application not found');
  }

  const [analysis] = await db
    .select()
    .from(aiAnalyses)
    .where(
      and(
        eq(aiAnalyses.applicationId, applicationId),
        eq(aiAnalyses.userId, userId),
        eq(aiAnalyses.type, 'analyze-job'),
        eq(aiAnalyses.status, 'completed'),
      ),
    )
    .orderBy(desc(aiAnalyses.createdAt))
    .limit(1);

  return analysis ?? null;
}

export async function saveAnalysisResult(
  jobId: string,
  result: JobAnalysisResult | Record<string, unknown>,
  applicationId?: string,
) {
  await db
    .update(aiAnalyses)
    .set({
      status: 'completed',
      result: result as Record<string, unknown>,
      ...(applicationId ? { applicationId } : {}),
    })
    .where(eq(aiAnalyses.jobId, jobId));
}

export async function saveAnalysisError(jobId: string, errorMessage: string) {
  await db
    .update(aiAnalyses)
    .set({ status: 'failed', error: errorMessage })
    .where(eq(aiAnalyses.jobId, jobId));
}
