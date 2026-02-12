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
