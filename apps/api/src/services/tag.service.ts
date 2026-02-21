import { eq, and } from 'drizzle-orm';
import type { CreateTag } from '@kariro/shared';
import { db } from '@/db/index.js';
import { tags, jobApplicationTags, jobApplications } from '@/db/schema/tables.js';
import { AppError } from '@/middleware/error.js';

export async function createTag(userId: string, data: CreateTag) {
  const [tag] = await db
    .insert(tags)
    .values({
      userId,
      name: data.name,
      color: data.color,
    })
    .returning();

  return tag;
}

export async function listTags(userId: string) {
  return db.select().from(tags).where(eq(tags.userId, userId));
}

export async function deleteTag(userId: string, tagId: string) {
  const [tag] = await db
    .select()
    .from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.userId, userId)));

  if (!tag) {
    throw new AppError(404, 'NOT_FOUND', 'Tag not found');
  }

  await db.delete(tags).where(eq(tags.id, tagId));
}

export async function attachTags(userId: string, applicationId: string, tagIds: string[]) {
  // Verify application ownership
  const [application] = await db
    .select()
    .from(jobApplications)
    .where(and(eq(jobApplications.id, applicationId), eq(jobApplications.userId, userId)));

  if (!application) {
    throw new AppError(404, 'NOT_FOUND', 'Application not found');
  }

  // Verify all tags belong to the user
  const userTags = await db
    .select()
    .from(tags)
    .where(eq(tags.userId, userId));

  const userTagIds = new Set(userTags.map((t) => t.id));
  const invalidTags = tagIds.filter((id) => !userTagIds.has(id));
  if (invalidTags.length > 0) {
    throw new AppError(400, 'INVALID_TAGS', 'Some tags do not belong to the user');
  }

  // Insert, ignoring duplicates
  const values = tagIds.map((tagId) => ({
    jobApplicationId: applicationId,
    tagId,
  }));

  await db.insert(jobApplicationTags).values(values).onConflictDoNothing();

  return { attached: tagIds.length };
}

export async function getTagsForApplication(userId: string, applicationId: string) {
  const [app] = await db
    .select()
    .from(jobApplications)
    .where(and(eq(jobApplications.id, applicationId), eq(jobApplications.userId, userId)));

  if (!app) {
    throw new AppError(404, 'NOT_FOUND', 'Application not found');
  }

  return db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      userId: tags.userId,
      createdAt: tags.createdAt,
      updatedAt: tags.updatedAt,
    })
    .from(tags)
    .innerJoin(jobApplicationTags, eq(jobApplicationTags.tagId, tags.id))
    .where(eq(jobApplicationTags.jobApplicationId, applicationId));
}

export async function removeTag(userId: string, applicationId: string, tagId: string) {
  // Verify application ownership
  const [application] = await db
    .select()
    .from(jobApplications)
    .where(and(eq(jobApplications.id, applicationId), eq(jobApplications.userId, userId)));

  if (!application) {
    throw new AppError(404, 'NOT_FOUND', 'Application not found');
  }

  const [deleted] = await db
    .delete(jobApplicationTags)
    .where(
      and(
        eq(jobApplicationTags.jobApplicationId, applicationId),
        eq(jobApplicationTags.tagId, tagId),
      ),
    )
    .returning();

  if (!deleted) {
    throw new AppError(404, 'NOT_FOUND', 'Tag not attached to this application');
  }
}
