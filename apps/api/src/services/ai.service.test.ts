import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@/middleware/error.js';

const userId = '550e8400-e29b-41d4-a716-446655440000';
const jobId = '880e8400-e29b-41d4-a716-446655440001';
const applicationId = '660e8400-e29b-41d4-a716-446655440001';
const now = new Date();

// Mock node:crypto
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  return {
    ...actual,
    default: {
      ...actual,
      randomUUID: vi.fn().mockReturnValue(jobId),
    },
  };
});

// Mock db — chain-style mock for Drizzle patterns:
//   insert().values() — bare thenable
//   select().from().where()
//   update().set().where()
//   delete().where()
//   select({ count }).from().where() — count query for queue limit
vi.mock('@/db/index.js', () => {
  const mockValues = vi.fn(() => ({
    then(resolve: (v?: unknown) => void) { resolve(); },
  }));
  const mockWhere = vi.fn();
  const mockDeleteWhere = vi.fn();
  const mockSetWhere = vi.fn();
  const mockSet = vi.fn(() => ({ where: mockSetWhere }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  const mockUpdate = vi.fn(() => ({ set: mockSet }));
  const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      _mockValues: mockValues,
      _mockWhere: mockWhere,
      _mockSet: mockSet,
      _mockSetWhere: mockSetWhere,
      _mockDelete: mockDelete,
      _mockDeleteWhere: mockDeleteWhere,
    },
  };
});

vi.mock('@/db/schema/tables.js', () => ({
  aiAnalyses: {
    id: 'id',
    userId: 'user_id',
    applicationId: 'application_id',
    jobId: 'job_id',
    type: 'type',
    status: 'status',
    input: 'input',
    result: 'result',
    error: 'error',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  coverLetters: {
    id: 'id',
    applicationId: 'application_id',
    userId: 'user_id',
    tone: 'tone',
    content: 'content',
    createdAt: 'created_at',
  },
}));

vi.mock('@/lib/queue.js', () => ({
  aiQueue: { add: vi.fn().mockResolvedValue({ id: jobId }) },
  connection: {},
}));

vi.mock('@/services/application.service.js', () => ({
  getApplication: vi.fn(),
}));

const { db } = await import('@/db/index.js');
const mockDb = db as typeof db & {
  _mockValues: ReturnType<typeof vi.fn>;
  _mockWhere: ReturnType<typeof vi.fn>;
  _mockSet: ReturnType<typeof vi.fn>;
  _mockSetWhere: ReturnType<typeof vi.fn>;
  _mockDelete: ReturnType<typeof vi.fn>;
  _mockDeleteWhere: ReturnType<typeof vi.fn>;
};
const { aiQueue } = await import('@/lib/queue.js');
const applicationService = await import('@/services/application.service.js');
const {
  enqueueAnalyzeJob,
  enqueueCoverLetterJob,
  getAnalysisByJobId,
  saveAnalysisResult,
  saveAnalysisError,
} = await import('./ai.service.js');

describe('AI Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the where mock's once-queue so leftover values from early-exit tests
    // don't leak into subsequent tests.
    mockDb._mockWhere.mockReset();
  });

  describe('enqueueAnalyzeJob', () => {
    it('inserts tracking row, enqueues job, and returns jobId', async () => {
      // Mock queue limit check (count query returns 0)
      mockDb._mockWhere.mockResolvedValueOnce([{ count: 0 }]);

      const result = await enqueueAnalyzeJob(userId, {
        jobDescription: 'Looking for a senior engineer...',
      });

      expect(result.jobId).toBe(jobId);
      expect(result.status).toBe('processing');
      expect(db.insert).toHaveBeenCalled();
      expect(aiQueue.add).toHaveBeenCalledWith(
        'analyze-job',
        expect.objectContaining({ userId, jobId, jobDescription: 'Looking for a senior engineer...' }),
        expect.objectContaining({ jobId, attempts: 3 }),
      );
    });

    it('rejects when user has too many pending analyses', async () => {
      mockDb._mockWhere.mockResolvedValueOnce([{ count: 10 }]);

      await expect(
        enqueueAnalyzeJob(userId, { jobDescription: 'test' }),
      ).rejects.toThrow('too many pending');
    });

    it('verifies application ownership when applicationId is provided', async () => {
      // Mock queue limit check
      mockDb._mockWhere.mockResolvedValueOnce([{ count: 0 }]);

      vi.mocked(applicationService.getApplication).mockResolvedValueOnce({
        id: applicationId,
        userId,
        companyName: 'Acme',
        roleTitle: 'Engineer',
        jobUrl: null,
        jobDescription: null,
        status: 'saved',
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: 'USD',
        location: null,
        workMode: null,
        notes: null,
        appliedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      await enqueueAnalyzeJob(userId, {
        jobDescription: 'test',
        applicationId,
      });

      expect(applicationService.getApplication).toHaveBeenCalledWith(userId, applicationId);
    });

    it('throws when applicationId does not belong to user', async () => {
      // Mock queue limit check
      mockDb._mockWhere.mockResolvedValueOnce([{ count: 0 }]);

      vi.mocked(applicationService.getApplication).mockRejectedValueOnce(
        new AppError(404, 'NOT_FOUND', 'Application not found'),
      );

      await expect(
        enqueueAnalyzeJob(userId, { jobDescription: 'test', applicationId: 'bad-id' }),
      ).rejects.toThrow(AppError);
    });

    it('cleans up tracking row and throws 503 when queue is unavailable', async () => {
      mockDb._mockWhere.mockResolvedValueOnce([{ count: 0 }]);
      mockDb._mockDeleteWhere.mockResolvedValueOnce(undefined);
      const { aiQueue } = await import('@/lib/queue.js');
      vi.mocked(aiQueue.add).mockRejectedValueOnce(new Error('Redis connection refused'));

      await expect(
        enqueueAnalyzeJob(userId, { jobDescription: 'test' }),
      ).rejects.toThrow('temporarily unavailable');

      expect(mockDb._mockDelete).toHaveBeenCalled();
    });
  });

  describe('enqueueCoverLetterJob', () => {
    const mockApp = {
      id: applicationId,
      userId,
      companyName: 'Acme',
      roleTitle: 'Engineer',
      jobUrl: null,
      jobDescription: 'TypeScript role',
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

    it('enqueues job and returns jobId', async () => {
      vi.mocked(applicationService.getApplication).mockResolvedValueOnce(mockApp);
      // Cover letter count check → 0 letters
      mockDb._mockWhere.mockResolvedValueOnce([{ letterCount: 0 }]);
      // Queue limit check → 0 pending
      mockDb._mockWhere.mockResolvedValueOnce([{ count: 0 }]);

      const result = await enqueueCoverLetterJob(userId, { applicationId, tone: 'formal' });

      expect(result.jobId).toBe(jobId);
      expect(result.status).toBe('processing');
      expect(aiQueue.add).toHaveBeenCalledWith(
        'generate-cover-letter',
        expect.objectContaining({ userId, jobId, applicationId, tone: 'formal' }),
        expect.objectContaining({ jobId, attempts: 3 }),
      );
    });

    it('rejects when cover letter cap is reached', async () => {
      vi.mocked(applicationService.getApplication).mockResolvedValueOnce(mockApp);
      // Cover letter count check → 20 letters (at cap)
      mockDb._mockWhere.mockResolvedValueOnce([{ letterCount: 20 }]);

      await expect(
        enqueueCoverLetterJob(userId, { applicationId, tone: 'formal' }),
      ).rejects.toThrow('Maximum of 20 cover letters reached');
    });

    it('rejects when user has too many pending analyses', async () => {
      vi.mocked(applicationService.getApplication).mockResolvedValueOnce(mockApp);
      // Cover letter count check → 0 letters
      mockDb._mockWhere.mockResolvedValueOnce([{ letterCount: 0 }]);
      // Queue limit check → 10 pending (at cap)
      mockDb._mockWhere.mockResolvedValueOnce([{ count: 10 }]);

      await expect(
        enqueueCoverLetterJob(userId, { applicationId, tone: 'formal' }),
      ).rejects.toThrow('too many pending');
    });

    it('throws when application not found', async () => {
      vi.mocked(applicationService.getApplication).mockRejectedValueOnce(
        new AppError(404, 'NOT_FOUND', 'Application not found'),
      );

      await expect(
        enqueueCoverLetterJob(userId, { applicationId, tone: 'confident' }),
      ).rejects.toThrow(AppError);
    });

    it('cleans up tracking row and throws 503 when queue is unavailable', async () => {
      vi.mocked(applicationService.getApplication).mockResolvedValueOnce(mockApp);
      mockDb._mockWhere.mockResolvedValueOnce([{ letterCount: 0 }]);
      mockDb._mockWhere.mockResolvedValueOnce([{ count: 0 }]);
      mockDb._mockDeleteWhere.mockResolvedValueOnce(undefined);
      const { aiQueue } = await import('@/lib/queue.js');
      vi.mocked(aiQueue.add).mockRejectedValueOnce(new Error('Redis connection refused'));

      await expect(
        enqueueCoverLetterJob(userId, { applicationId, tone: 'formal' }),
      ).rejects.toThrow('temporarily unavailable');

      expect(mockDb._mockDelete).toHaveBeenCalled();
    });
  });

  describe('getAnalysisByJobId', () => {
    it('returns analysis when found', async () => {
      const mockAnalysis = {
        id: 'test-id',
        userId,
        applicationId: null,
        jobId,
        type: 'analyze-job',
        status: 'completed',
        result: {},
        error: null,
        createdAt: now,
        updatedAt: now,
      };
      // Reset mockWhere to clear any leftover state, then set up for this test
      mockDb._mockWhere.mockReset();
      mockDb._mockWhere.mockResolvedValueOnce([mockAnalysis]);

      const result = await getAnalysisByJobId(userId, jobId);

      expect(result.jobId).toBe(jobId);
    });

    it('throws 404 when not found', async () => {
      mockDb._mockWhere.mockReset();
      mockDb._mockWhere.mockResolvedValueOnce([]);

      await expect(getAnalysisByJobId(userId, 'unknown')).rejects.toThrow(AppError);
    });
  });

  describe('saveAnalysisResult', () => {
    it('updates the analysis row to completed', async () => {
      mockDb._mockSetWhere.mockResolvedValueOnce(undefined);

      const mockResult = {
        companyName: 'Acme',
        roleTitle: 'Engineer',
        location: null,
        workMode: null,
        salaryRange: null,
        requiredSkills: ['TypeScript'],
        niceToHaveSkills: [],
        experienceLevel: 'mid' as const,
        keyResponsibilities: ['Build stuff'],
        redFlags: [],
        fitScore: 80,
        fitExplanation: 'Good match',
        missingSkills: [],
        summary: 'A role',
      };

      await saveAnalysisResult(jobId, mockResult);

      expect(db.update).toHaveBeenCalled();
      expect(mockDb._mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' }),
      );
    });
  });

  describe('saveAnalysisError', () => {
    it('updates the analysis row to failed', async () => {
      mockDb._mockSetWhere.mockResolvedValueOnce(undefined);

      await saveAnalysisError(jobId, 'AI provider timeout');

      expect(db.update).toHaveBeenCalled();
      expect(mockDb._mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed', error: 'AI provider timeout' }),
      );
    });
  });
});
