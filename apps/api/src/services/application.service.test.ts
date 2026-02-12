import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@/middleware/error.js';

// Mock the db module
vi.mock('@/db/index.js', () => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning, onConflictDoNothing: vi.fn() }));
  const mockSet = vi.fn(() => ({ where: vi.fn(() => ({ returning: mockReturning })) }));
  const mockWhere = vi.fn(() => ({ orderBy: vi.fn(() => ({ limit: vi.fn() })) }));
  const mockFrom = vi.fn(() => ({ where: mockWhere, innerJoin: vi.fn(() => ({ where: vi.fn() })) }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  const mockUpdate = vi.fn(() => ({ set: mockSet }));
  const mockDeleteWhere = vi.fn(() => ({ returning: mockReturning }));
  const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      _mockReturning: mockReturning,
      _mockFrom: mockFrom,
      _mockWhere: mockWhere,
      _mockValues: mockValues,
      _mockSelect: mockSelect,
    },
  };
});

// Mock the schema module (imported by the service)
vi.mock('@/db/schema/tables.js', () => ({
  jobApplications: {
    id: 'id',
    userId: 'user_id',
    companyName: 'company_name',
    roleTitle: 'role_title',
    status: 'status',
    createdAt: 'created_at',
  },
  jobApplicationTags: {
    jobApplicationId: 'job_application_id',
    tagId: 'tag_id',
  },
  tags: { id: 'id', userId: 'user_id' },
}));

// Import after mocking
const { db } = await import('@/db/index.js');
const {
  createApplication,
  getApplication,
  deleteApplication,
} = await import('./application.service.js');

const mockDb = db as typeof db & {
  _mockReturning: ReturnType<typeof vi.fn>;
  _mockFrom: ReturnType<typeof vi.fn>;
  _mockWhere: ReturnType<typeof vi.fn>;
  _mockValues: ReturnType<typeof vi.fn>;
};

describe('Application Service', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const appId = '660e8400-e29b-41d4-a716-446655440001';
  const now = new Date();

  const mockApplication = {
    id: appId,
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createApplication', () => {
    it('inserts a new application and returns it', async () => {
      mockDb._mockReturning.mockResolvedValueOnce([mockApplication]);

      const result = await createApplication(userId, {
        companyName: 'Acme Corp',
        roleTitle: 'Software Engineer',
      });

      expect(result).toEqual(mockApplication);
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('getApplication', () => {
    it('returns the application when found', async () => {
      mockDb._mockWhere.mockResolvedValueOnce([mockApplication]);

      const result = await getApplication(userId, appId);
      expect(result).toEqual(mockApplication);
    });

    it('throws AppError 404 when not found', async () => {
      mockDb._mockWhere.mockResolvedValueOnce([]);

      await expect(getApplication(userId, appId)).rejects.toThrow(AppError);
    });
  });

  describe('deleteApplication', () => {
    it('deletes the application after verifying ownership', async () => {
      // First call: getApplication check
      mockDb._mockWhere.mockResolvedValueOnce([mockApplication]);

      await deleteApplication(userId, appId);
      expect(db.delete).toHaveBeenCalled();
    });

    it('throws AppError 404 when application does not exist', async () => {
      mockDb._mockWhere.mockResolvedValueOnce([]);

      await expect(deleteApplication(userId, appId)).rejects.toThrow(AppError);
    });
  });
});
