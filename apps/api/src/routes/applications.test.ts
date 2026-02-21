import { describe, it, expect, vi, beforeEach } from 'vitest';

const userId = '550e8400-e29b-41d4-a716-446655440000';
const now = new Date();
const mockApplication = {
  id: '660e8400-e29b-41d4-a716-446655440001',
  userId,
  companyName: 'Acme Corp',
  roleTitle: 'Software Engineer',
  jobUrl: null,
  jobDescription: null,
  status: 'saved' as const,
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: 'USD',
  location: null,
  workMode: null,
  notes: null,
  appliedAt: null,
  createdAt: now,
  updatedAt: now,
};

// Mock services before importing app
vi.mock('@/services/application.service.js', () => ({
  createApplication: vi.fn(),
  getApplication: vi.fn(),
  listApplications: vi.fn(),
  updateApplication: vi.fn(),
  updateApplicationStatus: vi.fn(),
  deleteApplication: vi.fn(),
}));

vi.mock('@/services/tag.service.js', () => ({
  attachTags: vi.fn(),
  removeTag: vi.fn(),
  createTag: vi.fn(),
  listTags: vi.fn(),
  deleteTag: vi.fn(),
}));

// Mock auth service so requireAuth middleware passes
vi.mock('@/services/auth.service.js', () => ({
  verifyAccessToken: vi.fn().mockResolvedValue({
    sub: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
  }),
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  refreshAccessToken: vi.fn(),
  logoutUser: vi.fn(),
  getCurrentUser: vi.fn(),
  cleanupExpiredTokens: vi.fn(),
}));

vi.mock('@/services/profile.service.js', () => ({
  upsertProfile: vi.fn(),
  getProfile: vi.fn(),
}));

vi.mock('@/services/ai.service.js', () => ({
  enqueueAnalyzeJob: vi.fn(),
  enqueueCoverLetterJob: vi.fn(),
  enqueueInterviewPrepJob: vi.fn(),
  enqueueResumeGapJob: vi.fn(),
  getAnalysisByJobId: vi.fn(),
  saveAnalysisResult: vi.fn(),
  saveAnalysisError: vi.fn(),
}));

vi.mock('@/services/cover-letter.service.js', () => ({
  saveCoverLetter: vi.fn(),
  getCoverLettersByApplicationId: vi.fn(),
}));

vi.mock('@/services/interview-prep.service.js', () => ({
  saveInterviewPrep: vi.fn(),
  getInterviewPrepByApplicationId: vi.fn(),
}));

vi.mock('@/services/resume-gap.service.js', () => ({
  saveResumeGapAnalysis: vi.fn(),
  getResumeGapAnalysisByApplicationId: vi.fn(),
}));

vi.mock('@/lib/queue.js', () => ({
  aiQueue: { add: vi.fn() },
  connection: {},
}));

// Mock rate limiter to be a pass-through in tests
vi.mock('@/middleware/rate-limit.js', () => ({
  rateLimiter: () => async (_c: unknown, next: () => Promise<void>) => { await next(); },
}));

const applicationService = await import('@/services/application.service.js');
const coverLetterService = await import('@/services/cover-letter.service.js');
const interviewPrepService = await import('@/services/interview-prep.service.js');
const resumeGapService = await import('@/services/resume-gap.service.js');
const authService = await import('@/services/auth.service.js');
const app = (await import('../app.js')).default;

const authHeader = { Authorization: 'Bearer test-token' };

describe('Application Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-setup the default mock for verifyAccessToken after clearAllMocks
    vi.mocked(authService.verifyAccessToken).mockResolvedValue({ sub: userId, email: 'test@example.com' });
  });

  describe('POST /api/v1/applications', () => {
    it('creates an application and returns 201', async () => {
      vi.mocked(applicationService.createApplication).mockResolvedValueOnce(mockApplication);

      const res = await app.request('/api/v1/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify({
          companyName: 'Acme Corp',
          roleTitle: 'Software Engineer',
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as { success: boolean; data: { companyName: string } };
      expect(body.success).toBe(true);
      expect(body.data.companyName).toBe('Acme Corp');
    });

    it('returns 401 without auth token', async () => {
      const res = await app.request('/api/v1/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: 'Acme Corp',
          roleTitle: 'Software Engineer',
        }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/applications', () => {
    it('lists applications with cursor pagination', async () => {
      vi.mocked(applicationService.listApplications).mockResolvedValueOnce({
        data: [mockApplication],
        nextCursor: null,
        hasMore: false,
      });

      const res = await app.request('/api/v1/applications', {
        headers: authHeader,
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        success: boolean;
        data: unknown[];
        meta: { hasMore: boolean; nextCursor: string | null };
      };
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.meta.hasMore).toBe(false);
      expect(body.meta.nextCursor).toBeNull();
    });
  });

  describe('GET /api/v1/applications/:id', () => {
    it('returns a single application', async () => {
      vi.mocked(applicationService.getApplication).mockResolvedValueOnce(mockApplication);

      const res = await app.request(
        `/api/v1/applications/${mockApplication.id}`,
        { headers: authHeader },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; data: { id: string } };
      expect(body.data.id).toBe(mockApplication.id);
    });
  });

  describe('PATCH /api/v1/applications/:id/status', () => {
    it('updates status and returns the updated application', async () => {
      const updated = { ...mockApplication, status: 'applied' as const };
      vi.mocked(applicationService.updateApplicationStatus).mockResolvedValueOnce(updated);

      const res = await app.request(
        `/api/v1/applications/${mockApplication.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader,
          },
          body: JSON.stringify({ status: 'applied' }),
        },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { status: string } };
      expect(body.data.status).toBe('applied');
    });
  });

  describe('DELETE /api/v1/applications/:id', () => {
    it('deletes and returns 200', async () => {
      vi.mocked(applicationService.deleteApplication).mockResolvedValueOnce(undefined);

      const res = await app.request(
        `/api/v1/applications/${mockApplication.id}`,
        {
          method: 'DELETE',
          headers: authHeader,
        },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; data: null };
      expect(body.success).toBe(true);
      expect(body.data).toBeNull();
    });
  });

  describe('GET /api/v1/applications/:id/cover-letters', () => {
    const mockLetter = {
      id: 'aaa00000-0000-0000-0000-000000000001',
      applicationId: mockApplication.id,
      userId,
      tone: 'formal' as const,
      content: 'Dear Hiring Manager, ...',
      createdAt: now,
    };

    it('returns list of cover letters for an application', async () => {
      vi.mocked(coverLetterService.getCoverLettersByApplicationId).mockResolvedValueOnce([mockLetter]);

      const res = await app.request(
        `/api/v1/applications/${mockApplication.id}/cover-letters`,
        { headers: authHeader },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; data: { tone: string }[] };
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].tone).toBe('formal');
    });

    it('returns empty array when no cover letters exist', async () => {
      vi.mocked(coverLetterService.getCoverLettersByApplicationId).mockResolvedValueOnce([]);

      const res = await app.request(
        `/api/v1/applications/${mockApplication.id}/cover-letters`,
        { headers: authHeader },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(body.data).toHaveLength(0);
    });

    it('returns 404 when application not found', async () => {
      const { AppError } = await import('@/middleware/error.js');
      vi.mocked(coverLetterService.getCoverLettersByApplicationId).mockRejectedValueOnce(
        new AppError(404, 'NOT_FOUND', 'Application not found'),
      );

      const res = await app.request(
        `/api/v1/applications/${mockApplication.id}/cover-letters`,
        { headers: authHeader },
      );

      expect(res.status).toBe(404);
      const body = (await res.json()) as { errorCode: string };
      expect(body.errorCode).toBe('NOT_FOUND');
    });

    it('returns 401 without auth token', async () => {
      const res = await app.request(
        `/api/v1/applications/${mockApplication.id}/cover-letters`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/applications/:id/interview-prep', () => {
    const mockPrep = {
      id: 'bbb00000-0000-0000-0000-000000000001',
      applicationId: mockApplication.id,
      userId,
      content: {
        technicalQuestions: [],
        behavioralQuestions: [],
        companyResearchTips: ['Research the team'],
        questionsToAsk: ['What does success look like?'],
        preparationChecklist: ['Practice TypeScript'],
      },
      createdAt: now,
    };

    it('returns the most recent interview prep', async () => {
      vi.mocked(interviewPrepService.getInterviewPrepByApplicationId).mockResolvedValueOnce(mockPrep);

      const res = await app.request(
        `/api/v1/applications/${mockApplication.id}/interview-prep`,
        { headers: authHeader },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; data: { id: string } };
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(mockPrep.id);
    });

    it('returns null when no interview prep exists', async () => {
      vi.mocked(interviewPrepService.getInterviewPrepByApplicationId).mockResolvedValueOnce(null);

      const res = await app.request(
        `/api/v1/applications/${mockApplication.id}/interview-prep`,
        { headers: authHeader },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; data: null };
      expect(body.success).toBe(true);
      expect(body.data).toBeNull();
    });

    it('returns 404 when application not found', async () => {
      const { AppError } = await import('@/middleware/error.js');
      vi.mocked(interviewPrepService.getInterviewPrepByApplicationId).mockRejectedValueOnce(
        new AppError(404, 'NOT_FOUND', 'Application not found'),
      );

      const res = await app.request(
        `/api/v1/applications/${mockApplication.id}/interview-prep`,
        { headers: authHeader },
      );

      expect(res.status).toBe(404);
    });

    it('returns 401 without auth token', async () => {
      const res = await app.request(
        `/api/v1/applications/${mockApplication.id}/interview-prep`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/applications/:id/resume-gap', () => {
    const mockAnalysis = {
      id: 'ccc00000-0000-0000-0000-000000000001',
      applicationId: mockApplication.id,
      userId,
      content: {
        matchedSkills: [{ skill: 'TypeScript', evidenceFromResume: 'In experience section' }],
        missingSkills: [],
        overallMatch: 80,
        resumeSuggestions: ['Quantify achievements'],
        talkingPoints: ['Highlight TypeScript experience'],
      },
      createdAt: now,
    };

    it('returns the most recent resume gap analysis', async () => {
      vi.mocked(resumeGapService.getResumeGapAnalysisByApplicationId).mockResolvedValueOnce(mockAnalysis);

      const res = await app.request(
        `/api/v1/applications/${mockApplication.id}/resume-gap`,
        { headers: authHeader },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; data: { id: string } };
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(mockAnalysis.id);
    });

    it('returns null when no resume gap analysis exists', async () => {
      vi.mocked(resumeGapService.getResumeGapAnalysisByApplicationId).mockResolvedValueOnce(null);

      const res = await app.request(
        `/api/v1/applications/${mockApplication.id}/resume-gap`,
        { headers: authHeader },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; data: null };
      expect(body.success).toBe(true);
      expect(body.data).toBeNull();
    });

    it('returns 404 when application not found', async () => {
      const { AppError } = await import('@/middleware/error.js');
      vi.mocked(resumeGapService.getResumeGapAnalysisByApplicationId).mockRejectedValueOnce(
        new AppError(404, 'NOT_FOUND', 'Application not found'),
      );

      const res = await app.request(
        `/api/v1/applications/${mockApplication.id}/resume-gap`,
        { headers: authHeader },
      );

      expect(res.status).toBe(404);
    });

    it('returns 401 without auth token', async () => {
      const res = await app.request(
        `/api/v1/applications/${mockApplication.id}/resume-gap`,
      );
      expect(res.status).toBe(401);
    });
  });
});
