import { describe, it, expect, vi } from 'vitest';

// Mock services that app.ts imports transitively
vi.mock('@/services/auth.service.js', () => ({
  verifyAccessToken: vi.fn(),
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

const app = (await import('../app.js')).default;

describe('Health Check', () => {
  it('GET /api/v1/health returns 200 with status ok', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { status: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });
});
