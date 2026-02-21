export {
  applicationStatuses,
  ApplicationStatusSchema,
  type ApplicationStatus,
  workModes,
  WorkModeSchema,
  type WorkMode,
  ApplicationSchema,
  type Application,
  CreateApplicationSchema,
  type CreateApplication,
  UpdateApplicationSchema,
  type UpdateApplication,
  UpdateApplicationStatusSchema,
  type UpdateApplicationStatus,
  ListApplicationsQuerySchema,
  type ListApplicationsQuery,
} from './schemas/application.js';

export {
  TagSchema,
  type Tag,
  CreateTagSchema,
  type CreateTag,
  AttachTagsSchema,
  type AttachTags,
} from './schemas/tag.js';

export {
  RegisterSchema,
  type Register,
  LoginSchema,
  type Login,
  RefreshSchema,
  type Refresh,
  AuthTokensSchema,
  type AuthTokens,
  UserProfileSchema,
  type UserProfile,
} from './schemas/auth.js';

export {
  ProfileSchema,
  type Profile,
  UpsertProfileSchema,
  type UpsertProfile,
} from './schemas/profile.js';

export {
  analysisStatuses,
  AnalysisStatusSchema,
  type AnalysisStatus,
  AnalyzeJobRequestSchema,
  type AnalyzeJobRequest,
  JobAnalysisResultSchema,
  type JobAnalysisResult,
  AiAnalysisSchema,
  type AiAnalysis,
  JobAnalysisForApplicationSchema,
  type JobAnalysisForApplication,
  EnqueuedJobSchema,
  type EnqueuedJob,
} from './schemas/ai.js';

export {
  InterviewPrepRequestSchema,
  type InterviewPrepRequest,
  InterviewPrepResultSchema,
  type InterviewPrepResult,
  InterviewPrepResponseSchema,
  type InterviewPrepResponse,
} from './schemas/interview-prep.js';

export {
  ResumeGapRequestSchema,
  type ResumeGapRequest,
  ResumeGapResultSchema,
  type ResumeGapResult,
  ResumeGapResponseSchema,
  type ResumeGapResponse,
} from './schemas/resume-gap.js';

export {
  tones,
  type CoverLetterTone,
  CoverLetterRequestSchema,
  type CoverLetterRequest,
  CoverLetterResultSchema,
  type CoverLetterResult,
  CoverLetterSchema,
  type CoverLetter,
} from './schemas/cover-letter.js';

export type { ApiResponse, PaginatedResponse, CursorPaginatedResponse } from './types/api.js';
