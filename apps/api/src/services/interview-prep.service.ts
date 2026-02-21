import { eq, and, desc } from 'drizzle-orm';
import type { InterviewPrepResult } from '@kariro/shared';
import { db } from '@/db/index.js';
import { interviewPreps } from '@/db/schema/tables.js';
import * as applicationService from './application.service.js';

export async function saveInterviewPrep(
  userId: string,
  applicationId: string,
  content: InterviewPrepResult,
) {
  const [prep] = await db
    .insert(interviewPreps)
    .values({ userId, applicationId, content: content as Record<string, unknown> })
    .returning();

  return prep;
}

export async function getInterviewPrepByApplicationId(userId: string, applicationId: string) {
  // Verify ownership — throws 404 if not found or not owned by user
  await applicationService.getApplication(userId, applicationId);

  const [prep] = await db
    .select()
    .from(interviewPreps)
    .where(and(eq(interviewPreps.applicationId, applicationId), eq(interviewPreps.userId, userId)))
    .orderBy(desc(interviewPreps.createdAt))
    .limit(1);

  return prep ?? null;
}
