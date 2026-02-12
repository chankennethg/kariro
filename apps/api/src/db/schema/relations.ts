import { relations } from 'drizzle-orm';
import { users, jobApplications, tags, jobApplicationTags } from './tables.js';

export const usersRelations = relations(users, ({ many }) => ({
  jobApplications: many(jobApplications),
  tags: many(tags),
}));

export const jobApplicationsRelations = relations(jobApplications, ({ one, many }) => ({
  user: one(users, { fields: [jobApplications.userId], references: [users.id] }),
  jobApplicationTags: many(jobApplicationTags),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, { fields: [tags.userId], references: [users.id] }),
  jobApplicationTags: many(jobApplicationTags),
}));

export const jobApplicationTagsRelations = relations(jobApplicationTags, ({ one }) => ({
  jobApplication: one(jobApplications, {
    fields: [jobApplicationTags.jobApplicationId],
    references: [jobApplications.id],
  }),
  tag: one(tags, {
    fields: [jobApplicationTags.tagId],
    references: [tags.id],
  }),
}));
