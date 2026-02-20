import { eq } from 'drizzle-orm';
import type { UpsertProfile } from '@kariro/shared';
import { db } from '@/db/index.js';
import { userProfiles } from '@/db/schema/tables.js';

export async function upsertProfile(userId: string, data: UpsertProfile) {
  const [profile] = await db
    .insert(userProfiles)
    .values({ userId, ...data })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { ...data },
    })
    .returning();

  return profile;
}

export async function getProfile(userId: string) {
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));

  return profile ?? null;
}
