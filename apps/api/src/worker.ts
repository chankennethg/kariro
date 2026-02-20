import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { generateObject, generateText } from 'ai';
import { and, eq, desc } from 'drizzle-orm';
import { JobAnalysisResultSchema } from '@kariro/shared';
import type { CreateApplication, JobAnalysisResult, CoverLetterTone, CoverLetterResult } from '@kariro/shared';
import { connection } from './lib/queue.js';
import { db } from './db/index.js';
import { aiAnalyses } from './db/schema/tables.js';
import { getAiModel, buildAnalyzeJobPrompt, buildCoverLetterPrompt, fetchJobDescription } from './lib/ai.js';
import { log } from './lib/logger.js';
import * as aiService from './services/ai.service.js';
import * as profileService from './services/profile.service.js';
import * as applicationService from './services/application.service.js';
import * as coverLetterService from './services/cover-letter.service.js';

interface AnalyzeJobData {
  userId: string;
  jobId: string;
  jobDescription?: string;
  jobUrl?: string;
  applicationId?: string;
  autoCreateApplication?: boolean;
}

interface CoverLetterJobData {
  userId: string;
  jobId: string;
  applicationId: string;
  tone: CoverLetterTone;
}

type UserProfile = NonNullable<Awaited<ReturnType<typeof profileService.getProfile>>>;

function sanitizeWorkerError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('fetch') || msg.includes('url'))
      return 'Failed to fetch the job posting URL';
    if (msg.includes('timeout'))
      return 'Request timed out while processing';
    if (msg.includes('no job description'))
      return 'No job description text available';
    if (msg.includes('internal urls'))
      return 'The provided URL is not accessible';
  }
  return 'Analysis failed. Please try again later.';
}

function toProfileForPrompt(profile: UserProfile) {
  return {
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

async function fetchLatestAnalysis(applicationId: string): Promise<JobAnalysisResult | null> {
  const [latest] = await db
    .select()
    .from(aiAnalyses)
    .where(
      and(
        eq(aiAnalyses.applicationId, applicationId),
        eq(aiAnalyses.type, 'analyze-job'),
        eq(aiAnalyses.status, 'completed'),
      ),
    )
    .orderBy(desc(aiAnalyses.createdAt))
    .limit(1);

  return (latest?.result as JobAnalysisResult | undefined) ?? null;
}

async function maybeCreateApplication(
  userId: string,
  result: JobAnalysisResult,
  jobUrl: string | undefined,
  descriptionText: string,
): Promise<string | undefined> {
  const newAppData: CreateApplication = {
    companyName: result.companyName,
    roleTitle: result.roleTitle,
    jobUrl,
    jobDescription: descriptionText,
    status: 'saved',
    salaryMin: result.salaryRange?.min,
    salaryMax: result.salaryRange?.max,
    salaryCurrency: result.salaryRange?.currency,
    location: result.location ?? undefined,
    workMode: result.workMode ?? undefined,
  };
  const newApp = await applicationService.createApplication(userId, newAppData);
  return newApp.id;
}

async function processAnalyzeJob(job: Job<AnalyzeJobData>) {
  const { userId, jobId, jobDescription, jobUrl, applicationId, autoCreateApplication } = job.data;

  try {
    let descriptionText = jobDescription;
    if (!descriptionText && jobUrl) {
      descriptionText = await fetchJobDescription(jobUrl);
    }
    if (!descriptionText) throw new Error('No job description text available');

    const userProfile = await profileService.getProfile(userId);
    const profileForPrompt = userProfile ? toProfileForPrompt(userProfile) : null;

    const model = getAiModel();
    const prompt = buildAnalyzeJobPrompt(descriptionText, profileForPrompt);
    const { object: analysisResult } = await generateObject({
      model,
      schema: JobAnalysisResultSchema,
      system: prompt.system,
      prompt: prompt.user,
    });

    let finalApplicationId = applicationId;
    if (autoCreateApplication && !applicationId) {
      finalApplicationId = await maybeCreateApplication(userId, analysisResult, jobUrl, descriptionText);
    }

    await aiService.saveAnalysisResult(jobId, analysisResult, finalApplicationId);
    log.info({ jobId }, 'analyze-job completed');
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Unknown error';
    const userMessage = sanitizeWorkerError(error);
    await aiService.saveAnalysisError(jobId, userMessage);
    log.error({ jobId, error: rawMessage }, 'analyze-job failed');
    throw error; // Re-throw so BullMQ marks the job as failed
  }
}

async function processGenerateCoverLetter(job: Job<CoverLetterJobData>) {
  const { userId, jobId, applicationId, tone } = job.data;

  try {
    const application = await applicationService.getApplication(userId, applicationId);

    if (!application.jobDescription) {
      throw new Error('No job description available for cover letter generation');
    }

    const [latestAnalysis, userProfile] = await Promise.all([
      fetchLatestAnalysis(applicationId),
      profileService.getProfile(userId),
    ]);

    const profileForPrompt = userProfile ? toProfileForPrompt(userProfile) : null;
    const model = getAiModel();
    const prompt = buildCoverLetterPrompt(
      application.jobDescription,
      profileForPrompt,
      tone,
      latestAnalysis,
    );

    const { text: rawContent } = await generateText({
      model,
      system: prompt.system,
      prompt: prompt.user,
    });

    // Cap content length to prevent storage abuse from malfunctioning or manipulated AI output
    const content = rawContent.slice(0, 50_000);

    await coverLetterService.saveCoverLetter(userId, applicationId, tone, content);

    const result: CoverLetterResult = { content, tone, applicationId };
    await aiService.saveAnalysisResult(jobId, result as Record<string, unknown>);

    log.info({ jobId }, 'generate-cover-letter completed');
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Unknown error';
    await aiService.saveAnalysisError(jobId, sanitizeWorkerError(error));
    log.error({ jobId, error: rawMessage }, 'generate-cover-letter failed');
    throw error;
  }
}

const worker = new Worker<AnalyzeJobData>(
  'ai-jobs',
  async (job) => {
    switch (job.name) {
      case 'analyze-job':
        return processAnalyzeJob(job as Job<AnalyzeJobData>);
      case 'generate-cover-letter':
        return processGenerateCoverLetter(job as Job<CoverLetterJobData>);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection,
    concurrency: 3,
  },
);

worker.on('ready', () => log.info('Worker ready and listening for jobs'));
worker.on('failed', (job, err) => log.error({ jobId: job?.id, error: err.message }, 'Job failed'));

// Graceful shutdown — guard prevents double-close if both SIGTERM and SIGINT fire
let isShuttingDown = false;
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    log.info({ signal }, 'Received signal, shutting down...');
    const shutdownTimeout = setTimeout(() => process.exit(1), 30000);
    await worker.close();
    clearTimeout(shutdownTimeout);
    process.exit(0);
  });
}
