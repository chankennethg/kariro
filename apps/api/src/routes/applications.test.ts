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

// Mock rate limiter to be a pass-through in tests
vi.mock('@/middleware/rate-limit.js', () => ({
  rateLimiter: () => {
    const { createMiddleware } = require('hono/factory');
    return createMiddleware(async (_c: unknown, next: () => Promise<void>) => { await next(); });
  },
}));

const applicationService = await import('@/services/application.service.js');
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
});
