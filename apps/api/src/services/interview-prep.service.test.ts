import { describe, it, expect, vi, beforeEach } from 'vitest';

const userId = '550e8400-e29b-41d4-a716-446655440000';
const applicationId = '660e8400-e29b-41d4-a716-446655440001';
const now = new Date();

const mockPrep = {
  id: 'bbb00000-0000-0000-0000-000000000001',
  applicationId,
  userId,
  content: {
    technicalQuestions: [
      { question: 'Explain closures', suggestedAnswer: 'A closure...', difficulty: 'medium' },
    ],
    behavioralQuestions: [
      { question: 'Tell me about a challenge', suggestedAnswer: 'STAR format...', tip: 'Be specific' },
    ],
    companyResearchTips: ['Check their engineering blog'],
    questionsToAsk: ['What does the on-call rotation look like?'],
    preparationChecklist: ['Review TypeScript advanced types'],
  },
  createdAt: now,
};

const mockPrepContent = {
  technicalQuestions: [
    { question: 'Explain closures', suggestedAnswer: 'A closure...', difficulty: 'medium' as const },
  ],
  behavioralQuestions: [
    { question: 'Tell me about a challenge', suggestedAnswer: 'STAR format...', tip: 'Be specific' },
  ],
  companyResearchTips: ['Check their engineering blog'],
  questionsToAsk: ['What does the on-call rotation look like?'],
  preparationChecklist: ['Review TypeScript advanced types'],
};

// Mock db
const mockReturning = vi.fn().mockResolvedValue([mockPrep]);
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockLimit = vi.fn().mockResolvedValue([mockPrep]);
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
  interviewPreps: {},
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
const { saveInterviewPrep, getInterviewPrepByApplicationId } = await import('./interview-prep.service.js');

describe('InterviewPrepService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(applicationService.getApplication).mockResolvedValue(mockApplication);
    mockInsertValues.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([mockPrep]);
    mockSelectWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([mockPrep]);
  });

  describe('saveInterviewPrep', () => {
    it('inserts a new interview prep and returns it', async () => {
      const result = await saveInterviewPrep(userId, applicationId, mockPrepContent);

      expect(mockInsert).toHaveBeenCalledWith(expect.anything());
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({ userId, applicationId, content: mockPrepContent }),
      );
      expect(result).toEqual(mockPrep);
    });
  });

  describe('getInterviewPrepByApplicationId', () => {
    it('returns the most recent interview prep', async () => {
      const result = await getInterviewPrepByApplicationId(userId, applicationId);

      expect(applicationService.getApplication).toHaveBeenCalledWith(userId, applicationId);
      expect(mockSelect).toHaveBeenCalled();
      expect(mockLimit).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockPrep);
    });

    it('returns null when no prep exists', async () => {
      mockLimit.mockResolvedValueOnce([]);

      const result = await getInterviewPrepByApplicationId(userId, applicationId);

      expect(result).toBeNull();
    });

    it('throws when application not found', async () => {
      const { AppError } = await import('@/middleware/error.js');
      vi.mocked(applicationService.getApplication).mockRejectedValueOnce(
        new AppError(404, 'NOT_FOUND', 'Application not found'),
      );

      await expect(getInterviewPrepByApplicationId(userId, 'nonexistent-id')).rejects.toThrow(
        'Application not found',
      );
    });
  });
});
