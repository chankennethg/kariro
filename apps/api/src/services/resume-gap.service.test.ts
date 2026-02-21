import { describe, it, expect, vi, beforeEach } from 'vitest';

const userId = '550e8400-e29b-41d4-a716-446655440000';
const applicationId = '660e8400-e29b-41d4-a716-446655440001';
const now = new Date();

const mockAnalysis = {
  id: 'ccc00000-0000-0000-0000-000000000001',
  applicationId,
  userId,
  content: {
    matchedSkills: [{ skill: 'TypeScript', evidenceFromResume: 'Mentioned in experience section' }],
    missingSkills: [{ skill: 'Kubernetes', importance: 'nice-to-have', suggestion: 'Take a course' }],
    overallMatch: 75,
    resumeSuggestions: ['Quantify your achievements'],
    talkingPoints: ['Mention TypeScript projects'],
  },
  createdAt: now,
};

const mockAnalysisContent = {
  matchedSkills: [{ skill: 'TypeScript', evidenceFromResume: 'Mentioned in experience section' }],
  missingSkills: [
    { skill: 'Kubernetes', importance: 'nice-to-have' as const, suggestion: 'Take a course' },
  ],
  overallMatch: 75,
  resumeSuggestions: ['Quantify your achievements'],
  talkingPoints: ['Mention TypeScript projects'],
};

// Mock db
const mockReturning = vi.fn().mockResolvedValue([mockAnalysis]);
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockLimit = vi.fn().mockResolvedValue([mockAnalysis]);
const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
const mockSelectWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock('@/db/index.js', () => ({
  db: {
    insert: mockInsert,
    select: mockSelect,
  },
}));

vi.mock('@/db/schema/tables.js', () => ({
  resumeGapAnalyses: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}));

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

vi.mock('./application.service.js', () => ({
  getApplication: vi.fn().mockResolvedValue(mockApplication),
}));

const applicationService = await import('./application.service.js');
const { saveResumeGapAnalysis, getResumeGapAnalysisByApplicationId } = await import('./resume-gap.service.js');

describe('ResumeGapService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(applicationService.getApplication).mockResolvedValue(mockApplication);
    mockInsertValues.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([mockAnalysis]);
    mockSelectWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([mockAnalysis]);
  });

  describe('saveResumeGapAnalysis', () => {
    it('inserts a new resume gap analysis and returns it', async () => {
      const result = await saveResumeGapAnalysis(userId, applicationId, mockAnalysisContent);

      expect(mockInsert).toHaveBeenCalledWith(expect.anything());
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({ userId, applicationId, content: mockAnalysisContent }),
      );
      expect(result).toEqual(mockAnalysis);
    });
  });

  describe('getResumeGapAnalysisByApplicationId', () => {
    it('returns the most recent resume gap analysis', async () => {
      const result = await getResumeGapAnalysisByApplicationId(userId, applicationId);

      expect(applicationService.getApplication).toHaveBeenCalledWith(userId, applicationId);
      expect(mockSelect).toHaveBeenCalled();
      expect(mockLimit).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockAnalysis);
    });

    it('returns null when no analysis exists', async () => {
      mockLimit.mockResolvedValueOnce([]);

      const result = await getResumeGapAnalysisByApplicationId(userId, applicationId);

      expect(result).toBeNull();
    });

    it('throws when application not found', async () => {
      const { AppError } = await import('@/middleware/error.js');
      vi.mocked(applicationService.getApplication).mockRejectedValueOnce(
        new AppError(404, 'NOT_FOUND', 'Application not found'),
      );

      await expect(getResumeGapAnalysisByApplicationId(userId, 'nonexistent-id')).rejects.toThrow(
        'Application not found',
      );
    });
  });
});
