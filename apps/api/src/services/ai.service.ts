import crypto from 'node:crypto';
import { eq, and, sql } from 'drizzle-orm';
import type { AnalyzeJobRequest, JobAnalysisResult, CoverLetterRequest } from '@kariro/shared';
import { db } from '@/db/index.js';
import { aiAnalyses, coverLetters } from '@/db/schema/tables.js';
import { aiQueue } from '@/lib/queue.js';
import { AppError } from '@/middleware/error.js';
import * as applicationService from './application.service.js';

const MAX_PENDING_ANALYSES = 10;
const MAX_COVER_LETTERS_PER_APPLICATION = 20;

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
  // Verify application ownership
  await applicationService.getApplication(userId, data.applicationId);

  // Per-application cover letter cap to prevent AI cost abuse
  const [{ letterCount }] = await db
    .select({ letterCount: sql<number>`count(*)::int` })
    .from(coverLetters)
    .where(and(eq(coverLetters.applicationId, data.applicationId), eq(coverLetters.userId, userId)));

  if (letterCount >= MAX_COVER_LETTERS_PER_APPLICATION) {
    throw new AppError(
      429,
      'COVER_LETTER_LIMIT',
      `Maximum of ${MAX_COVER_LETTERS_PER_APPLICATION} cover letters reached for this application. Delete some to generate more.`,
    );
  }

  // Per-user queue limit to prevent queue flooding (shared across all job types)
  await enforceQueueLimit(userId);

  const jobId = crypto.randomUUID();

  await db.insert(aiAnalyses).values({
    userId,
    applicationId: data.applicationId,
    jobId,
    type: 'generate-cover-letter',
    status: 'processing',
    input: data as Record<string, unknown>,
  });

  try {
    await aiQueue.add(
      'generate-cover-letter',
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
