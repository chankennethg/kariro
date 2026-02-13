import { describe, it, expect, vi, beforeEach } from 'vitest';

const userId = '550e8400-e29b-41d4-a716-446655440000';
const email = 'test@example.com';
const name = 'Test User';
const now = new Date().toISOString();

const mockUser = { id: userId, email, name, createdAt: now };
const mockTokens = { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token', expiresIn: 900 };

// Mock auth service
vi.mock('@/services/auth.service.js', () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  refreshAccessToken: vi.fn(),
  logoutUser: vi.fn(),
  getCurrentUser: vi.fn(),
  verifyAccessToken: vi.fn(),
  cleanupExpiredTokens: vi.fn(),
}));

// Mock other services (imported by route files that app.ts mounts)
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

// Mock rate limiter to be a pass-through in tests
vi.mock('@/middleware/rate-limit.js', () => ({
  rateLimiter: () => {
    const { createMiddleware } = require('hono/factory');
    return createMiddleware(async (_c: unknown, next: () => Promise<void>) => { await next(); });
  },
}));

const authService = await import('@/services/auth.service.js');
const app = (await import('../app.js')).default;

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('returns 201 with user and tokens', async () => {
      vi.mocked(authService.registerUser).mockResolvedValueOnce({
        user: mockUser,
        tokens: mockTokens,
      });

      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Password123', name }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toMatchObject({
        success: true,
        data: { user: { email }, tokens: { accessToken: 'mock-access-token' } },
      });
    });

    it('returns 400 for invalid email', async () => {
      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email', password: 'Password123', name }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for short password', async () => {
      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'short', name }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for password exceeding 72 characters', async () => {
      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Aa1' + 'x'.repeat(70), name }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for password without complexity (no uppercase)', async () => {
      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'alllowercase1', name }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 200 with user and tokens', async () => {
      vi.mocked(authService.loginUser).mockResolvedValueOnce({
        user: mockUser,
        tokens: mockTokens,
      });

      const res = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Password123' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({
        success: true,
        data: { tokens: { accessToken: 'mock-access-token' } },
      });
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('returns 200 with new tokens', async () => {
      vi.mocked(authService.refreshAccessToken).mockResolvedValueOnce(mockTokens);

      const res = await app.request('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'mock-refresh-token' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({
        success: true,
        data: { accessToken: 'mock-access-token' },
      });
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('returns 200 when authenticated', async () => {
      vi.mocked(authService.verifyAccessToken).mockResolvedValueOnce({ sub: userId, email });
      vi.mocked(authService.logoutUser).mockResolvedValueOnce(undefined);

      const res = await app.request('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({ refreshToken: 'mock-refresh-token' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ success: true, data: null });
    });

    it('returns 401 without token', async () => {
      const res = await app.request('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'mock-refresh-token' }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 200 with user profile when authenticated', async () => {
      vi.mocked(authService.verifyAccessToken).mockResolvedValueOnce({ sub: userId, email });
      vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(mockUser);

      const res = await app.request('/api/v1/auth/me', {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ success: true, data: { id: userId } });
    });

    it('returns 401 without token', async () => {
      const res = await app.request('/api/v1/auth/me');

      expect(res.status).toBe(401);
    });
  });
});
