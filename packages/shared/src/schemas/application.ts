import { z } from 'zod';

// Enums
export const applicationStatuses = [
  'saved',
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];
export const ApplicationStatusSchema = z.enum(applicationStatuses);

export const workModes = ['remote', 'hybrid', 'onsite'] as const;
export type WorkMode = (typeof workModes)[number];
export const WorkModeSchema = z.enum(workModes);

// Response schema — what the API returns
export const ApplicationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  companyName: z.string(),
  roleTitle: z.string(),
  jobUrl: z.string().nullable(),
  jobDescription: z.string().nullable(),
  status: ApplicationStatusSchema,
  salaryMin: z.number().int().nullable(),
  salaryMax: z.number().int().nullable(),
  salaryCurrency: z.string().nullable(),
  location: z.string().nullable(),
  workMode: WorkModeSchema.nullable(),
  notes: z.string().nullable(),
  appliedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Application = z.infer<typeof ApplicationSchema>;

// Create request
export const CreateApplicationSchema = z.object({
  companyName: z.string().min(1).max(255),
  roleTitle: z.string().min(1).max(255),
  jobUrl: z.string().url().max(2048).optional(),
  jobDescription: z.string().optional(),
  status: ApplicationStatusSchema.optional(),
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
  salaryCurrency: z.string().max(10).optional(),
  location: z.string().max(255).optional(),
  workMode: WorkModeSchema.optional(),
  notes: z.string().optional(),
  appliedAt: z.string().datetime().optional(),
});
export type CreateApplication = z.infer<typeof CreateApplicationSchema>;

// Update request (all fields optional)
export const UpdateApplicationSchema = z.object({
  companyName: z.string().min(1).max(255).optional(),
  roleTitle: z.string().min(1).max(255).optional(),
  jobUrl: z.string().url().max(2048).nullable().optional(),
  jobDescription: z.string().nullable().optional(),
  status: ApplicationStatusSchema.optional(),
  salaryMin: z.number().int().nonnegative().nullable().optional(),
  salaryMax: z.number().int().nonnegative().nullable().optional(),
  salaryCurrency: z.string().max(10).nullable().optional(),
  location: z.string().max(255).nullable().optional(),
  workMode: WorkModeSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  appliedAt: z.string().datetime().nullable().optional(),
});
export type UpdateApplication = z.infer<typeof UpdateApplicationSchema>;

// Status update (for Kanban drag-and-drop)
export const UpdateApplicationStatusSchema = z.object({
  status: ApplicationStatusSchema,
});
export type UpdateApplicationStatus = z.infer<typeof UpdateApplicationStatusSchema>;

// List query params
export const ListApplicationsQuerySchema = z.object({
  status: ApplicationStatusSchema.optional(),
  tag: z.string().uuid().optional(),
  search: z.string().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type ListApplicationsQuery = z.infer<typeof ListApplicationsQuerySchema>;
