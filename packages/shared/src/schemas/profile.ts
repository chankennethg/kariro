import { z } from 'zod';

// Response schema — what the API returns
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  resumeText: z.string().nullable(),
  skills: z.array(z.string()),
  preferredRoles: z.array(z.string()),
  preferredLocations: z.array(z.string()),
  salaryExpectationMin: z.number().int().nullable(),
  salaryExpectationMax: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Profile = z.infer<typeof ProfileSchema>;

// Upsert request (all fields optional — partial updates supported)
export const UpsertProfileSchema = z.object({
  resumeText: z.string().max(50000).optional(),
  skills: z.array(z.string().max(100)).max(100).optional(),
  preferredRoles: z.array(z.string().max(255)).max(20).optional(),
  preferredLocations: z.array(z.string().max(255)).max(20).optional(),
  salaryExpectationMin: z.number().int().nonnegative().optional(),
  salaryExpectationMax: z.number().int().nonnegative().optional(),
});
export type UpsertProfile = z.infer<typeof UpsertProfileSchema>;
