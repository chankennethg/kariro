import { describe, it, expect, vi, beforeEach } from 'vitest';

const userId = '550e8400-e29b-41d4-a716-446655440000';
const applicationId = '660e8400-e29b-41d4-a716-446655440001';
const now = new Date();

const mockLetter = {
  id: 'aaa00000-0000-0000-0000-000000000001',
  applicationId,
  userId,
  tone: 'formal' as const,
  content: 'Dear Hiring Manager, ...',
  createdAt: now,
};

const mockApplication = {
  id: applicationId,
  userId,
  companyName: 'Acme Corp',
  roleTitle: 'Software Engineer',
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

// Mock db
const mockReturning = vi.fn().mockResolvedValue([mockLetter]);
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockSelectOrderBy = vi.fn().mockResolvedValue([mockLetter]);
const mockSelectWhere = vi.fn().mockReturnValue({ orderBy: mockSelectOrderBy });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock('@/db/index.js', () => ({
  db: {
    insert: mockInsert,
    select: mockSelect,
  },
}));

vi.mock('@/db/schema/tables.js', () => ({
  coverLetters: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}));

// Mock application service
vi.mock('./application.service.js', () => ({
  getApplication: vi.fn().mockResolvedValue(mockApplication),
}));

const applicationService = await import('./application.service.js');
const { saveCoverLetter, getCoverLettersByApplicationId } = await import('./cover-letter.service.js');

describe('CoverLetterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(applicationService.getApplication).mockResolvedValue(mockApplication);
    mockInsertValues.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([mockLetter]);
    // Reset select chain
    mockSelectWhere.mockReturnValue({ orderBy: mockSelectOrderBy });
    mockSelectOrderBy.mockResolvedValue([mockLetter]);
  });

  describe('saveCoverLetter', () => {
    it('inserts a new cover letter and returns it', async () => {
      const result = await saveCoverLetter(userId, applicationId, 'formal', 'Dear Hiring Manager, ...');

      expect(mockInsert).toHaveBeenCalledWith(expect.anything());
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({ userId, applicationId, tone: 'formal', content: 'Dear Hiring Manager, ...' }),
      );
      expect(result).toEqual(mockLetter);
    });
  });

  describe('getCoverLettersByApplicationId', () => {
    it('verifies ownership and returns cover letters', async () => {
      const result = await getCoverLettersByApplicationId(userId, applicationId);

      expect(applicationService.getApplication).toHaveBeenCalledWith(userId, applicationId);
      expect(mockSelect).toHaveBeenCalled();
      expect(result).toEqual([mockLetter]);
    });

    it('throws when application not found', async () => {
      const { AppError } = await import('@/middleware/error.js');
      vi.mocked(applicationService.getApplication).mockRejectedValueOnce(
        new AppError(404, 'NOT_FOUND', 'Application not found'),
      );

      await expect(getCoverLettersByApplicationId(userId, 'nonexistent-id')).rejects.toThrow(
        'Application not found',
      );
    });
  });
});
