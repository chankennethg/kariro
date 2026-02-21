import { eq, and, desc } from 'drizzle-orm';
import type { ResumeGapResult } from '@kariro/shared';
import { db } from '@/db/index.js';
import { resumeGapAnalyses } from '@/db/schema/tables.js';
import * as applicationService from './application.service.js';

export async function saveResumeGapAnalysis(
  userId: string,
  applicationId: string,
  content: ResumeGapResult,
) {
  const [analysis] = await db
    .insert(resumeGapAnalyses)
    .values({ userId, applicationId, content: content as Record<string, unknown> })
    .returning();

  return analysis;
}

export async function getResumeGapAnalysisByApplicationId(userId: string, applicationId: string) {
  // Verify ownership — throws 404 if not found or not owned by user
  await applicationService.getApplication(userId, applicationId);

  const [analysis] = await db
    .select()
    .from(resumeGapAnalyses)
    .where(
      and(eq(resumeGapAnalyses.applicationId, applicationId), eq(resumeGapAnalyses.userId, userId)),
    )
    .orderBy(desc(resumeGapAnalyses.createdAt))
    .limit(1);

  return analysis ?? null;
}
