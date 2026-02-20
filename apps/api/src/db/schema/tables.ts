import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  unique,
  primaryKey,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';

// ---- Enums ----

export const applicationStatusEnum = pgEnum('application_status', [
  'saved',
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
]);

export const workModeEnum = pgEnum('work_mode', ['remote', 'hybrid', 'onsite']);

export const analysisStatusEnum = pgEnum('analysis_status', [
  'processing',
  'completed',
  'failed',
]);

export const toneEnum = pgEnum('cover_letter_tone', ['formal', 'conversational', 'confident']);

// ---- Users ----

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ---- Job Applications ----

export const jobApplications = pgTable('job_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  roleTitle: varchar('role_title', { length: 255 }).notNull(),
  jobUrl: varchar('job_url', { length: 2048 }),
  jobDescription: text('job_description'),
  status: applicationStatusEnum('status').notNull().default('saved'),
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  salaryCurrency: varchar('salary_currency', { length: 10 }).default('USD'),
  location: varchar('location', { length: 255 }),
  workMode: workModeEnum('work_mode'),
  notes: text('notes'),
  appliedAt: timestamp('applied_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ---- Tags ----

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 7 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique('tags_user_id_name_unique').on(t.userId, t.name)],
);

// ---- Refresh Tokens ----

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('refresh_tokens_user_id_idx').on(t.userId)],
);

// ---- Junction: Job Application Tags ----

export const jobApplicationTags = pgTable(
  'job_application_tags',
  {
    jobApplicationId: uuid('job_application_id')
      .notNull()
      .references(() => jobApplications.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.jobApplicationId, t.tagId] })],
);

// ---- User Profiles ----

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  resumeText: text('resume_text'),
  skills: jsonb('skills').$type<string[]>().notNull().default([]),
  preferredRoles: jsonb('preferred_roles').$type<string[]>().notNull().default([]),
  preferredLocations: jsonb('preferred_locations').$type<string[]>().notNull().default([]),
  salaryExpectationMin: integer('salary_expectation_min'),
  salaryExpectationMax: integer('salary_expectation_max'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ---- Cover Letters ----

// Cover letters are immutable after creation — updatedAt is intentionally omitted.
export const coverLetters = pgTable(
  'cover_letters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => jobApplications.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tone: toneEnum('tone').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('cover_letters_user_id_idx').on(t.userId),
    index('cover_letters_application_id_idx').on(t.applicationId),
  ],
);

// ---- AI Analyses ----

export const aiAnalyses = pgTable(
  'ai_analyses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // set null (not cascade) — the analysis result has standalone value even after the
    // application is deleted (e.g. user may still want to view the extracted skills/fit score).
    applicationId: uuid('application_id').references(() => jobApplications.id, {
      onDelete: 'set null',
    }),
    jobId: varchar('job_id', { length: 255 }).notNull().unique(),
    type: varchar('type', { length: 50 }).notNull(),
    status: analysisStatusEnum('status').notNull().default('processing'),
    input: jsonb('input').$type<Record<string, unknown>>().notNull(),
    result: jsonb('result').$type<Record<string, unknown>>(),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('ai_analyses_user_id_idx').on(t.userId),
    index('ai_analyses_job_id_idx').on(t.jobId),
  ],
);
