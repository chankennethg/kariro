import { describe, it, expect, vi, beforeEach } from 'vitest';

const userId = '550e8400-e29b-41d4-a716-446655440000';
const now = new Date();

const mockProfile = {
  id: '770e8400-e29b-41d4-a716-446655440001',
  userId,
  resumeText: 'Experienced developer',
  skills: ['TypeScript', 'React'],
  preferredRoles: ['Senior Engineer'],
  preferredLocations: ['Remote'],
  salaryExpectationMin: 100000,
  salaryExpectationMax: 150000,
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

const profileService = await import('@/services/profile.service.js');
const authService = await import('@/services/auth.service.js');
const app = (await import('../app.js')).default;

const authHeader = { Authorization: 'Bearer test-token' };

describe('Profile Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authService.verifyAccessToken).mockResolvedValue({
      sub: userId,
      email: 'test@example.com',
    });
  });

  describe('PUT /api/v1/profile', () => {
    it('returns 200 with upserted profile', async () => {
      vi.mocked(profileService.upsertProfile).mockResolvedValueOnce(mockProfile);

      const res = await app.request('/api/v1/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          resumeText: 'Experienced developer',
          skills: ['TypeScript', 'React'],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.resumeText).toBe('Experienced developer');
      expect(body.data.skills).toEqual(['TypeScript', 'React']);
      expect(body.data.createdAt).toBe(now.toISOString());
    });

    it('returns 400 when salaryExpectationMin > salaryExpectationMax in the same request', async () => {
      vi.mocked(profileService.getProfile).mockResolvedValueOnce(null);

      const res = await app.request('/api/v1/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ salaryExpectationMin: 200000, salaryExpectationMax: 100000 }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/minimum salary/i);
    });

    it('returns 400 when incoming min exceeds existing max', async () => {
      vi.mocked(profileService.getProfile).mockResolvedValueOnce({
        ...mockProfile,
        salaryExpectationMin: null,
        salaryExpectationMax: 80000,
      });

      const res = await app.request('/api/v1/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ salaryExpectationMin: 120000 }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/minimum salary/i);
    });

    it('returns 401 without auth token', async () => {
      const res = await app.request('/api/v1/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: 'test' }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/profile', () => {
    it('returns 200 with profile when it exists', async () => {
      vi.mocked(profileService.getProfile).mockResolvedValueOnce(mockProfile);

      const res = await app.request('/api/v1/profile', {
        headers: authHeader,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(mockProfile.id);
    });

    it('returns 200 with null data when no profile exists', async () => {
      vi.mocked(profileService.getProfile).mockResolvedValueOnce(null);

      const res = await app.request('/api/v1/profile', {
        headers: authHeader,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeNull();
    });

    it('returns 401 without auth token', async () => {
      const res = await app.request('/api/v1/profile');
      expect(res.status).toBe(401);
    });
  });
});
