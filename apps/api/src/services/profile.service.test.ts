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

// Mock db — chain-style mock for Drizzle patterns:
//   insert().values().onConflictDoUpdate().returning()
//   select().from().where()
vi.mock('@/db/index.js', () => {
  const mockReturning = vi.fn();
  const mockOnConflictDoUpdate = vi.fn(() => ({ returning: mockReturning }));
  const mockValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate }));
  const mockWhere = vi.fn();
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      _mockReturning: mockReturning,
      _mockOnConflictDoUpdate: mockOnConflictDoUpdate,
      _mockValues: mockValues,
      _mockWhere: mockWhere,
      _mockFrom: mockFrom,
    },
  };
});

vi.mock('@/db/schema/tables.js', () => ({
  userProfiles: {
    id: 'id',
    userId: 'user_id',
    resumeText: 'resume_text',
    skills: 'skills',
    preferredRoles: 'preferred_roles',
    preferredLocations: 'preferred_locations',
    salaryExpectationMin: 'salary_expectation_min',
    salaryExpectationMax: 'salary_expectation_max',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
}));

const { db } = await import('@/db/index.js');
const mockDb = db as typeof db & {
  _mockReturning: ReturnType<typeof vi.fn>;
  _mockWhere: ReturnType<typeof vi.fn>;
};

const { upsertProfile, getProfile } = await import('./profile.service.js');

describe('Profile Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('upsertProfile', () => {
    it('creates a new profile and returns it', async () => {
      mockDb._mockReturning.mockResolvedValueOnce([mockProfile]);

      const result = await upsertProfile(userId, {
        resumeText: 'Experienced developer',
        skills: ['TypeScript', 'React'],
      });

      expect(result.id).toBe(mockProfile.id);
      expect(result.resumeText).toBe('Experienced developer');
      expect(result.skills).toEqual(['TypeScript', 'React']);
    });

    it('updates an existing profile via onConflictDoUpdate', async () => {
      const updated = { ...mockProfile, resumeText: 'Updated resume' };
      mockDb._mockReturning.mockResolvedValueOnce([updated]);

      const result = await upsertProfile(userId, { resumeText: 'Updated resume' });

      expect(result.resumeText).toBe('Updated resume');
    });
  });

  describe('getProfile', () => {
    it('returns profile when it exists', async () => {
      mockDb._mockWhere.mockResolvedValueOnce([mockProfile]);

      const result = await getProfile(userId);

      expect(result).not.toBeNull();
      expect(result!.userId).toBe(userId);
    });

    it('returns null when no profile exists', async () => {
      mockDb._mockWhere.mockResolvedValueOnce([]);

      const result = await getProfile(userId);

      expect(result).toBeNull();
    });
  });
});
