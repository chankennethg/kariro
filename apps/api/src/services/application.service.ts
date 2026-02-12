import { eq, and, ilike, or, lt, desc, inArray } from 'drizzle-orm';
import type { CreateApplication, UpdateApplication } from '@kariro/shared';
import { db } from '@/db/index.js';
import { jobApplications, jobApplicationTags, tags } from '@/db/schema/tables.js';
import { AppError } from '@/middleware/error.js';

export async function createApplication(userId: string, data: CreateApplication) {
  const [application] = await db
    .insert(jobApplications)
    .values({
      userId,
      companyName: data.companyName,
      roleTitle: data.roleTitle,
      jobUrl: data.jobUrl,
      jobDescription: data.jobDescription,
      status: data.status ?? 'saved',
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      salaryCurrency: data.salaryCurrency,
      location: data.location,
      workMode: data.workMode,
      notes: data.notes,
      appliedAt: data.appliedAt ? new Date(data.appliedAt) : null,
    })
    .returning();

  return application;
}

export async function getApplication(userId: string, applicationId: string) {
  const [application] = await db
    .select()
    .from(jobApplications)
    .where(and(eq(jobApplications.id, applicationId), eq(jobApplications.userId, userId)));

  if (!application) {
    throw new AppError(404, 'NOT_FOUND', 'Application not found');
  }

  return application;
}

export async function listApplications(
  userId: string,
  options: {
    status?: string;
    tag?: string;
    search?: string;
    cursor?: string;
    limit: number;
  },
) {
  const conditions = [eq(jobApplications.userId, userId)];

  if (options.status) {
    conditions.push(
      eq(
        jobApplications.status,
        options.status as
          | 'saved'
          | 'applied'
          | 'screening'
          | 'interview'
          | 'offer'
          | 'rejected'
          | 'withdrawn',
      ),
    );
  }

  if (options.search) {
    const searchTerm = `%${options.search}%`;
    conditions.push(
      or(
        ilike(jobApplications.companyName, searchTerm),
        ilike(jobApplications.roleTitle, searchTerm),
      )!,
    );
  }

  // If filtering by tag, get matching application IDs first
  if (options.tag) {
    const taggedAppIds = await db
      .select({ jobApplicationId: jobApplicationTags.jobApplicationId })
      .from(jobApplicationTags)
      .innerJoin(tags, eq(jobApplicationTags.tagId, tags.id))
      .where(eq(tags.id, options.tag));

    const ids = taggedAppIds.map((r) => r.jobApplicationId);
    if (ids.length === 0) {
      return { data: [], nextCursor: null, hasMore: false };
    }
    conditions.push(inArray(jobApplications.id, ids));
  }

  // Cursor-based pagination: fetch items created before the cursor
  if (options.cursor) {
    const [cursorApp] = await db
      .select({ createdAt: jobApplications.createdAt })
      .from(jobApplications)
      .where(eq(jobApplications.id, options.cursor));

    if (cursorApp) {
      conditions.push(lt(jobApplications.createdAt, cursorApp.createdAt));
    }
  }

  // Fetch limit + 1 to determine if there are more results
  const results = await db
    .select()
    .from(jobApplications)
    .where(and(...conditions))
    .orderBy(desc(jobApplications.createdAt))
    .limit(options.limit + 1);

  const hasMore = results.length > options.limit;
  const data = hasMore ? results.slice(0, options.limit) : results;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, nextCursor, hasMore };
}

export async function updateApplication(
  userId: string,
  applicationId: string,
  data: UpdateApplication,
) {
  // Verify ownership
  await getApplication(userId, applicationId);

  const [updated] = await db
    .update(jobApplications)
    .set({
      ...data,
      appliedAt: data.appliedAt !== undefined ? (data.appliedAt ? new Date(data.appliedAt) : null) : undefined,
    })
    .where(and(eq(jobApplications.id, applicationId), eq(jobApplications.userId, userId)))
    .returning();

  return updated;
}

export async function updateApplicationStatus(
  userId: string,
  applicationId: string,
  status: string,
) {
  await getApplication(userId, applicationId);

  const [updated] = await db
    .update(jobApplications)
    .set({
      status: status as
        | 'saved'
        | 'applied'
        | 'screening'
        | 'interview'
        | 'offer'
        | 'rejected'
        | 'withdrawn',
    })
    .where(and(eq(jobApplications.id, applicationId), eq(jobApplications.userId, userId)))
    .returning();

  return updated;
}

export async function deleteApplication(userId: string, applicationId: string) {
  await getApplication(userId, applicationId);

  await db
    .delete(jobApplications)
    .where(and(eq(jobApplications.id, applicationId), eq(jobApplications.userId, userId)));
}
