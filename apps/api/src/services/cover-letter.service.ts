import { eq, and, desc } from 'drizzle-orm';
import type { CoverLetterTone } from '@kariro/shared';
import { db } from '@/db/index.js';
import { coverLetters } from '@/db/schema/tables.js';
import * as applicationService from './application.service.js';

export async function saveCoverLetter(
  userId: string,
  applicationId: string,
  tone: CoverLetterTone,
  content: string,
) {
  const [letter] = await db
    .insert(coverLetters)
    .values({ userId, applicationId, tone, content })
    .returning();

  return letter;
}

export async function getCoverLettersByApplicationId(userId: string, applicationId: string) {
  // Verify ownership — throws 404 if not found or not owned by user
  await applicationService.getApplication(userId, applicationId);

  return db
    .select()
    .from(coverLetters)
    .where(and(eq(coverLetters.applicationId, applicationId), eq(coverLetters.userId, userId)))
    .orderBy(desc(coverLetters.createdAt));
}
