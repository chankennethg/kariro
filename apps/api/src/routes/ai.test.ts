import { describe, it, expect, vi, beforeEach } from 'vitest';

const userId = '550e8400-e29b-41d4-a716-446655440000';
const jobId = '880e8400-e29b-41d4-a716-446655440001';
const now = new Date();

const mockAnalysis = {
  id: '990e8400-e29b-41d4-a716-446655440001',
  userId,
  applicationId: null,
  jobId,
  type: 'analyze-job',
  status: 'completed' as const,
  input: { jobDescription: 'Test job' },
  result: {
    companyName: 'Acme Corp',
    roleTitle: 'Software Engineer',
    location: 'Remote',
    workMode: 'remote',
    salaryRange: { min: 100000, max: 150000, currency: 'USD' },
    requiredSkills: ['TypeScript'],
    niceToHaveSkills: ['Go'],
    experienceLevel: 'mid',
    keyResponsibilities: ['Build features'],
    redFlags: [],
    fitScore: 85,
    fitExplanation: 'Strong match',
    missingSkills: [],
    summary: 'A great role',
  },
  error: null,
  createdAt: now,
  updatedAt: now,
};

// Mock all services that app.ts imports
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

vi.mock('@/services/application.service.js', () => ({
  createApplication: vi.fn(),
  getApplication: vi.fn(),
  listApplications: vi.fn(),
  updateApplication: vi.fn(),
  updateApplicationStatus: vi.fn(),
  deleteApplication: vi.fn(),
}));

vi.mock('@/services/tag.service.js', () => ({
  createTag: vi.fn(),
  listTags: vi.fn(),
  deleteTag: vi.fn(),
  attachTags: vi.fn(),
  removeTag: vi.fn(),
}));

vi.mock('@/services/profile.service.js', () => ({
  upsertProfile: vi.fn(),
  getProfile: vi.fn(),
}));

vi.mock('@/services/ai.service.js', () => ({
  enqueueAnalyzeJob: vi.fn(),
  enqueueCoverLetterJob: vi.fn(),
  getAnalysisByJobId: vi.fn(),
  saveAnalysisResult: vi.fn(),
  saveAnalysisError: vi.fn(),
}));

vi.mock('@/services/cover-letter.service.js', () => ({
  saveCoverLetter: vi.fn(),
  getCoverLettersByApplicationId: vi.fn(),
}));

vi.mock('@/lib/queue.js', () => ({
  aiQueue: { add: vi.fn() },
  connection: {},
}));

vi.mock('@/middleware/rate-limit.js', () => ({
  rateLimiter: () => async (_c: unknown, next: () => Promise<void>) => { await next(); },
}));

const aiService = await import('@/services/ai.service.js');
const authService = await import('@/services/auth.service.js');
const app = (await import('../app.js')).default;

const authHeader = { Authorization: 'Bearer test-token' };

describe('AI Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authService.verifyAccessToken).mockResolvedValue({
      sub: userId,
      email: 'test@example.com',
    });
  });

  describe('POST /api/v1/ai/analyze-job', () => {
    it('returns 202 with jobId when enqueued', async () => {
      vi.mocked(aiService.enqueueAnalyzeJob).mockResolvedValueOnce({
        jobId,
        status: 'processing',
      });

      const res = await app.request('/api/v1/ai/analyze-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ jobDescription: 'Looking for a senior engineer...' }),
      });

      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.jobId).toBe(jobId);
      expect(body.data.status).toBe('processing');
    });

    it('returns 400 when neither jobDescription nor jobUrl provided', async () => {
      const res = await app.request('/api/v1/ai/analyze-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.errorCode).toBe('INVALID_INPUT');
    });

    it('accepts jobUrl instead of jobDescription', async () => {
      vi.mocked(aiService.enqueueAnalyzeJob).mockResolvedValueOnce({
        jobId,
        status: 'processing',
      });

      const res = await app.request('/api/v1/ai/analyze-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ jobUrl: 'https://example.com/jobs/123' }),
      });

      expect(res.status).toBe(202);
    });

    it('returns 401 without auth token', async () => {
      const res = await app.request('/api/v1/ai/analyze-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: 'test' }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/ai/jobs/:jobId', () => {
    it('returns 200 with analysis data', async () => {
      vi.mocked(aiService.getAnalysisByJobId).mockResolvedValueOnce(mockAnalysis);

      const res = await app.request(`/api/v1/ai/jobs/${jobId}`, {
        headers: authHeader,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.jobId).toBe(jobId);
      expect(body.data.status).toBe('completed');
      expect(body.data.result.companyName).toBe('Acme Corp');
    });

    it('returns 404 for unknown jobId', async () => {
      const { AppError } = await import('@/middleware/error.js');
      vi.mocked(aiService.getAnalysisByJobId).mockRejectedValueOnce(
        new AppError(404, 'NOT_FOUND', 'Analysis job not found'),
      );

      const unknownId = '000e8400-e29b-41d4-a716-446655440099';
      const res = await app.request(`/api/v1/ai/jobs/${unknownId}`, {
        headers: authHeader,
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.errorCode).toBe('NOT_FOUND');
    });

    it('returns 401 without auth token', async () => {
      const res = await app.request(`/api/v1/ai/jobs/${jobId}`);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/ai/cover-letter', () => {
    const applicationId = '660e8400-e29b-41d4-a716-446655440001';

    it('returns 202 with jobId when enqueued', async () => {
      vi.mocked(aiService.enqueueCoverLetterJob).mockResolvedValueOnce({
        jobId,
        status: 'processing',
      });

      const res = await app.request('/api/v1/ai/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ applicationId, tone: 'formal' }),
      });

      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.jobId).toBe(jobId);
      expect(body.data.status).toBe('processing');
      expect(aiService.enqueueCoverLetterJob).toHaveBeenCalledWith(userId, {
        applicationId,
        tone: 'formal',
      });
    });

    it('returns 400 for invalid tone', async () => {
      const res = await app.request('/api/v1/ai/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ applicationId, tone: 'robotic' }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 when applicationId is missing', async () => {
      const res = await app.request('/api/v1/ai/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ tone: 'formal' }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 404 when application not found', async () => {
      const { AppError } = await import('@/middleware/error.js');
      vi.mocked(aiService.enqueueCoverLetterJob).mockRejectedValueOnce(
        new AppError(404, 'NOT_FOUND', 'Application not found'),
      );

      const res = await app.request('/api/v1/ai/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ applicationId, tone: 'confident' }),
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.errorCode).toBe('NOT_FOUND');
    });

    it('returns 401 without auth token', async () => {
      const res = await app.request('/api/v1/ai/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, tone: 'formal' }),
      });

      expect(res.status).toBe(401);
    });
  });
});
