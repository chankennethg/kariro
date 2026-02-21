import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@/middleware/error.js';

const userId = '550e8400-e29b-41d4-a716-446655440000';
const applicationId = '660e8400-e29b-41d4-a716-446655440001';
const tagId = '770e8400-e29b-41d4-a716-446655440002';
const now = new Date();

const mockApp = {
  id: applicationId,
  userId,
};

const mockTag = {
  id: tagId,
  userId,
  name: 'Backend',
  color: '#3B82F6',
  createdAt: now,
  updatedAt: now,
};

// Mock db with all chain variants used by tag.service
vi.mock('@/db/index.js', () => {
  // select chain for simple .from().where()
  const mockWhere = vi.fn();
  const mockInnerJoinWhere = vi.fn();
  const mockInnerJoin = vi.fn(() => ({ where: mockInnerJoinWhere }));
  const mockFrom = vi.fn(() => ({ where: mockWhere, innerJoin: mockInnerJoin }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));

  // insert chain
  const mockReturning = vi.fn();
  const mockInsertValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

  // delete chain
  const mockDeleteReturning = vi.fn();
  const mockDeleteWhere = vi.fn(() => ({ returning: mockDeleteReturning }));
  const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
      _mockWhere: mockWhere,
      _mockInnerJoinWhere: mockInnerJoinWhere,
      _mockInnerJoin: mockInnerJoin,
      _mockFrom: mockFrom,
      _mockReturning: mockReturning,
      _mockDeleteReturning: mockDeleteReturning,
    },
  };
});

vi.mock('@/db/schema/tables.js', () => ({
  tags: { id: 'id', userId: 'user_id', name: 'name', color: 'color', createdAt: 'created_at', updatedAt: 'updated_at' },
  jobApplications: { id: 'id', userId: 'user_id' },
  jobApplicationTags: { tagId: 'tag_id', jobApplicationId: 'job_application_id' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}));

const { db } = await import('@/db/index.js');
const mockDb = db as typeof db & {
  _mockWhere: ReturnType<typeof vi.fn>;
  _mockInnerJoinWhere: ReturnType<typeof vi.fn>;
  _mockInnerJoin: ReturnType<typeof vi.fn>;
  _mockFrom: ReturnType<typeof vi.fn>;
  _mockReturning: ReturnType<typeof vi.fn>;
  _mockDeleteReturning: ReturnType<typeof vi.fn>;
};

const {
  getTagsForApplication,
  listTags,
  createTag,
} = await import('./tag.service.js');

describe('Tag Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb._mockWhere.mockReset();
    mockDb._mockInnerJoinWhere.mockReset();
    mockDb._mockReturning.mockReset();
    mockDb._mockDeleteReturning.mockReset();
  });

  describe('getTagsForApplication', () => {
    it('returns tags for the application', async () => {
      // First select: verify ownership → app found
      mockDb._mockWhere.mockResolvedValueOnce([mockApp]);
      // Second select: innerJoin().where() → tags
      mockDb._mockInnerJoinWhere.mockResolvedValueOnce([mockTag]);

      const result = await getTagsForApplication(userId, applicationId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Backend');
    });

    it('returns empty array when no tags attached', async () => {
      mockDb._mockWhere.mockResolvedValueOnce([mockApp]);
      mockDb._mockInnerJoinWhere.mockResolvedValueOnce([]);

      const result = await getTagsForApplication(userId, applicationId);

      expect(result).toHaveLength(0);
    });

    it('throws 404 when application not found', async () => {
      mockDb._mockWhere.mockResolvedValueOnce([]);

      await expect(
        getTagsForApplication(userId, applicationId),
      ).rejects.toThrow(AppError);
    });

    it('throws with correct error message when application not found', async () => {
      mockDb._mockWhere.mockResolvedValueOnce([]);

      await expect(
        getTagsForApplication(userId, 'unknown-id'),
      ).rejects.toMatchObject({ message: 'Application not found' });
    });
  });

  describe('listTags', () => {
    it('returns all tags for a user', async () => {
      mockDb._mockWhere.mockResolvedValueOnce([mockTag]);

      const result = await listTags(userId);

      expect(result).toEqual([mockTag]);
    });
  });

  describe('createTag', () => {
    it('inserts a tag and returns it', async () => {
      mockDb._mockReturning.mockResolvedValueOnce([mockTag]);

      const result = await createTag(userId, { name: 'Backend', color: '#3B82F6' });

      expect(result.name).toBe('Backend');
      expect(db.insert).toHaveBeenCalled();
    });
  });
});
