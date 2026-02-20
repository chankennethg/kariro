import { relations } from 'drizzle-orm';
import {
  users,
  jobApplications,
  tags,
  jobApplicationTags,
  refreshTokens,
  userProfiles,
  aiAnalyses,
  coverLetters,
} from './tables.js';

export const usersRelations = relations(users, ({ one, many }) => ({
  jobApplications: many(jobApplications),
  tags: many(tags),
  refreshTokens: many(refreshTokens),
  profile: one(userProfiles),
  aiAnalyses: many(aiAnalyses),
  coverLetters: many(coverLetters),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export const jobApplicationsRelations = relations(jobApplications, ({ one, many }) => ({
  user: one(users, { fields: [jobApplications.userId], references: [users.id] }),
  jobApplicationTags: many(jobApplicationTags),
  aiAnalyses: many(aiAnalyses),
  coverLetters: many(coverLetters),
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

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, { fields: [userProfiles.userId], references: [users.id] }),
}));

export const aiAnalysesRelations = relations(aiAnalyses, ({ one }) => ({
  user: one(users, { fields: [aiAnalyses.userId], references: [users.id] }),
  application: one(jobApplications, {
    fields: [aiAnalyses.applicationId],
    references: [jobApplications.id],
  }),
}));

export const coverLettersRelations = relations(coverLetters, ({ one }) => ({
  application: one(jobApplications, {
    fields: [coverLetters.applicationId],
    references: [jobApplications.id],
  }),
  user: one(users, { fields: [coverLetters.userId], references: [users.id] }),
}));
