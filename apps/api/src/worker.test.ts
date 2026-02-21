import { describe, it, expect, vi, beforeEach } from 'vitest';

const userId = '550e8400-e29b-41d4-a716-446655440000';
const jobId = '880e8400-e29b-41d4-a716-446655440001';
const now = new Date();

const mockAnalysisResult = {
  companyName: 'Acme Corp',
  roleTitle: 'Software Engineer',
  location: 'Remote',
  workMode: 'remote' as const,
  salaryRange: { min: 100000, max: 150000, currency: 'USD' },
  requiredSkills: ['TypeScript', 'React'],
  niceToHaveSkills: ['Go'],
  experienceLevel: 'mid' as const,
  keyResponsibilities: ['Build features', 'Code reviews'],
  redFlags: [],
  fitScore: 85,
  fitExplanation: 'Strong match based on skills',
  missingSkills: ['Go'],
  summary: 'A great engineering role at Acme Corp',
};

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

const mockInterviewPrepResult = {
  technicalQuestions: [
    { question: 'Explain closures', suggestedAnswer: 'A closure...', difficulty: 'medium' as const },
  ],
  behavioralQuestions: [
    { question: 'Tell me about a challenge', suggestedAnswer: 'STAR...', tip: 'Be specific' },
  ],
  companyResearchTips: ['Check their engineering blog'],
  questionsToAsk: ['What does on-call look like?'],
  preparationChecklist: ['Review TypeScript'],
};

const mockResumeGapResult = {
  matchedSkills: [{ skill: 'TypeScript', evidenceFromResume: 'In experience section' }],
  missingSkills: [{ skill: 'Kubernetes', importance: 'nice-to-have' as const, suggestion: 'Take a course' }],
  overallMatch: 75,
  resumeSuggestions: ['Quantify achievements'],
  talkingPoints: ['Highlight TypeScript experience'],
};

// Mock AI SDK
vi.mock('ai', () => ({
  generateObject: vi.fn().mockResolvedValue({ object: mockAnalysisResult }),
  generateText: vi.fn().mockResolvedValue({ text: 'Dear Hiring Manager, ...' }),
}));

// Mock AI helpers
vi.mock('./lib/ai.js', () => ({
  getAiModel: vi.fn().mockReturnValue('mock-model'),
  buildAnalyzeJobPrompt: vi.fn().mockReturnValue({
    system: 'You are an analyst',
    user: 'Analyze this job',
  }),
  buildCoverLetterPrompt: vi.fn().mockReturnValue({
    system: 'You are a cover letter writer',
    user: 'Write a cover letter',
  }),
  buildInterviewPrepPrompt: vi.fn().mockReturnValue({
    system: 'You are an interview coach',
    user: 'Generate interview prep',
  }),
  buildResumeGapPrompt: vi.fn().mockReturnValue({
    system: 'You are a career coach',
    user: 'Analyze resume gaps',
  }),
  fetchJobDescription: vi.fn().mockResolvedValue('Extracted job description text'),
}));

// Mock services
vi.mock('./services/ai.service.js', () => ({
  saveAnalysisResult: vi.fn(),
  saveAnalysisError: vi.fn(),
}));

vi.mock('./services/profile.service.js', () => ({
  getProfile: vi.fn(),
}));

vi.mock('./services/application.service.js', () => ({
  createApplication: vi.fn(),
  getApplication: vi.fn(),
}));

vi.mock('./services/cover-letter.service.js', () => ({
  saveCoverLetter: vi.fn(),
  getCoverLettersByApplicationId: vi.fn(),
}));

vi.mock('./services/interview-prep.service.js', () => ({
  saveInterviewPrep: vi.fn(),
  getInterviewPrepByApplicationId: vi.fn(),
}));

vi.mock('./services/resume-gap.service.js', () => ({
  saveResumeGapAnalysis: vi.fn(),
  getResumeGapAnalysisByApplicationId: vi.fn(),
}));

// Mock DB for cover letter worker (aiAnalyses query)
vi.mock('./db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
  },
}));

vi.mock('./db/schema/tables.js', () => ({
  aiAnalyses: {},
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn(),
  eq: vi.fn(),
  desc: vi.fn(),
}));

// Mock BullMQ Worker so it doesn't actually connect to Redis
let workerProcessor: (job: unknown) => Promise<unknown>;
vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation((_name: string, processor: (job: unknown) => Promise<unknown>) => {
    workerProcessor = processor;
    return {
      on: vi.fn(),
      close: vi.fn(),
    };
  }),
}));

vi.mock('./lib/queue.js', () => ({
  connection: {},
  aiQueue: { add: vi.fn() },
}));

const { generateObject, generateText } = await import('ai');
const { fetchJobDescription } = await import('./lib/ai.js');
const aiService = await import('./services/ai.service.js');
const profileService = await import('./services/profile.service.js');
const applicationService = await import('./services/application.service.js');
const coverLetterService = await import('./services/cover-letter.service.js');
const interviewPrepService = await import('./services/interview-prep.service.js');
const resumeGapService = await import('./services/resume-gap.service.js');

// Import worker to register the processor
await import('./worker.js');

const mockApplication = {
  id: '660e8400-e29b-41d4-a716-446655440001',
  userId,
  companyName: 'Acme Corp',
  roleTitle: 'Software Engineer',
  jobUrl: null,
  jobDescription: 'We are looking for a senior TypeScript engineer.',
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

describe('Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(profileService.getProfile).mockResolvedValue(mockProfile);
    vi.mocked(generateObject).mockResolvedValue({
      object: mockAnalysisResult,
      toJsonResponse: vi.fn(),
    } as never);
    vi.mocked(generateText).mockResolvedValue({
      text: 'Dear Hiring Manager, I am excited to apply for this role...',
    } as never);
    vi.mocked(applicationService.getApplication).mockResolvedValue(mockApplication);
  });

  it('processes an analyze-job with jobDescription', async () => {
    const job = {
      name: 'analyze-job',
      data: { userId, jobId, jobDescription: 'Looking for a senior engineer' },
    };

    await workerProcessor(job);

    expect(generateObject).toHaveBeenCalled();
    expect(aiService.saveAnalysisResult).toHaveBeenCalledWith(
      jobId,
      mockAnalysisResult,
      undefined,
    );
  });

  it('fetches job description from URL when jobUrl provided', async () => {
    const job = {
      name: 'analyze-job',
      data: { userId, jobId, jobUrl: 'https://example.com/jobs/123' },
    };

    await workerProcessor(job);

    expect(fetchJobDescription).toHaveBeenCalledWith('https://example.com/jobs/123');
    expect(generateObject).toHaveBeenCalled();
  });

  it('auto-creates application when autoCreateApplication is true', async () => {
    const newAppId = 'aaa00000-0000-0000-0000-000000000001';
    vi.mocked(applicationService.createApplication).mockResolvedValueOnce({
      id: newAppId,
      userId,
      companyName: 'Acme Corp',
      roleTitle: 'Software Engineer',
      jobUrl: null,
      jobDescription: 'Looking for a senior engineer',
      status: 'saved',
      salaryMin: 100000,
      salaryMax: 150000,
      salaryCurrency: 'USD',
      location: 'Remote',
      workMode: 'remote',
      notes: null,
      appliedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const job = {
      name: 'analyze-job',
      data: {
        userId,
        jobId,
        jobDescription: 'Looking for a senior engineer',
        autoCreateApplication: true,
      },
    };

    await workerProcessor(job);

    expect(applicationService.createApplication).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ companyName: 'Acme Corp', roleTitle: 'Software Engineer' }),
    );
    expect(aiService.saveAnalysisResult).toHaveBeenCalledWith(
      jobId,
      mockAnalysisResult,
      newAppId,
    );
  });

  it('saves sanitized error when AI generation fails', async () => {
    vi.mocked(generateObject).mockRejectedValueOnce(new Error('AI provider timeout'));

    const job = {
      name: 'analyze-job',
      data: { userId, jobId, jobDescription: 'test' },
    };

    await expect(workerProcessor(job)).rejects.toThrow('AI provider timeout');
    // Error message is sanitized before storing in DB
    expect(aiService.saveAnalysisError).toHaveBeenCalledWith(
      jobId,
      'Request timed out while processing',
    );
  });

  it('throws on unknown job type', async () => {
    const job = { name: 'unknown-type', data: {} };
    await expect(workerProcessor(job)).rejects.toThrow('Unknown job type: unknown-type');
  });

  describe('generate-cover-letter job', () => {
    const applicationId = mockApplication.id;

    it('generates a cover letter and saves it', async () => {
      const job = {
        name: 'generate-cover-letter',
        data: { userId, jobId, applicationId, tone: 'formal' },
      };

      await workerProcessor(job);

      expect(generateText).toHaveBeenCalled();
      expect(coverLetterService.saveCoverLetter).toHaveBeenCalledWith(
        userId,
        applicationId,
        'formal',
        expect.any(String),
      );
      expect(aiService.saveAnalysisResult).toHaveBeenCalledWith(
        jobId,
        expect.objectContaining({ tone: 'formal', applicationId }),
      );
    });

    it('throws when application has no job description', async () => {
      vi.mocked(applicationService.getApplication).mockResolvedValueOnce({
        ...mockApplication,
        jobDescription: null,
      });

      const job = {
        name: 'generate-cover-letter',
        data: { userId, jobId, applicationId, tone: 'conversational' },
      };

      await expect(workerProcessor(job)).rejects.toThrow();
      expect(aiService.saveAnalysisError).toHaveBeenCalled();
      expect(coverLetterService.saveCoverLetter).not.toHaveBeenCalled();
    });

    it('saves sanitized error when generateText fails', async () => {
      vi.mocked(generateText).mockRejectedValueOnce(new Error('AI provider timeout'));

      const job = {
        name: 'generate-cover-letter',
        data: { userId, jobId, applicationId, tone: 'confident' },
      };

      await expect(workerProcessor(job)).rejects.toThrow('AI provider timeout');
      expect(aiService.saveAnalysisError).toHaveBeenCalledWith(
        jobId,
        'Request timed out while processing',
      );
    });
  });

  describe('interview-prep job', () => {
    const applicationId = mockApplication.id;

    it('generates interview prep and saves it', async () => {
      vi.mocked(generateObject).mockResolvedValueOnce({
        object: mockInterviewPrepResult,
        toJsonResponse: vi.fn(),
      } as never);

      const job = {
        name: 'interview-prep',
        data: { userId, jobId, applicationId },
      };

      await workerProcessor(job);

      expect(generateObject).toHaveBeenCalled();
      expect(interviewPrepService.saveInterviewPrep).toHaveBeenCalledWith(
        userId,
        applicationId,
        mockInterviewPrepResult,
      );
      expect(aiService.saveAnalysisResult).toHaveBeenCalledWith(
        jobId,
        mockInterviewPrepResult,
        applicationId,
      );
    });

    it('throws when application has no job description', async () => {
      vi.mocked(applicationService.getApplication).mockResolvedValueOnce({
        ...mockApplication,
        jobDescription: null,
      });

      const job = {
        name: 'interview-prep',
        data: { userId, jobId, applicationId },
      };

      await expect(workerProcessor(job)).rejects.toThrow();
      expect(aiService.saveAnalysisError).toHaveBeenCalled();
      expect(interviewPrepService.saveInterviewPrep).not.toHaveBeenCalled();
    });

    it('saves sanitized error when generateObject fails', async () => {
      vi.mocked(generateObject).mockRejectedValueOnce(new Error('AI provider timeout'));

      const job = {
        name: 'interview-prep',
        data: { userId, jobId, applicationId },
      };

      await expect(workerProcessor(job)).rejects.toThrow('AI provider timeout');
      expect(aiService.saveAnalysisError).toHaveBeenCalledWith(
        jobId,
        'Request timed out while processing',
      );
    });
  });

  describe('resume-gap job', () => {
    const applicationId = mockApplication.id;

    it('generates resume gap analysis and saves it', async () => {
      vi.mocked(generateObject).mockResolvedValueOnce({
        object: mockResumeGapResult,
        toJsonResponse: vi.fn(),
      } as never);

      const job = {
        name: 'resume-gap',
        data: { userId, jobId, applicationId },
      };

      await workerProcessor(job);

      expect(generateObject).toHaveBeenCalled();
      expect(resumeGapService.saveResumeGapAnalysis).toHaveBeenCalledWith(
        userId,
        applicationId,
        mockResumeGapResult,
      );
      expect(aiService.saveAnalysisResult).toHaveBeenCalledWith(
        jobId,
        mockResumeGapResult,
        applicationId,
      );
    });

    it('throws when application has no job description', async () => {
      vi.mocked(applicationService.getApplication).mockResolvedValueOnce({
        ...mockApplication,
        jobDescription: null,
      });

      const job = {
        name: 'resume-gap',
        data: { userId, jobId, applicationId },
      };

      await expect(workerProcessor(job)).rejects.toThrow();
      expect(aiService.saveAnalysisError).toHaveBeenCalled();
      expect(resumeGapService.saveResumeGapAnalysis).not.toHaveBeenCalled();
    });

    it('saves sanitized error when generateObject fails', async () => {
      vi.mocked(generateObject).mockRejectedValueOnce(new Error('AI provider timeout'));

      const job = {
        name: 'resume-gap',
        data: { userId, jobId, applicationId },
      };

      await expect(workerProcessor(job)).rejects.toThrow('AI provider timeout');
      expect(aiService.saveAnalysisError).toHaveBeenCalledWith(
        jobId,
        'Request timed out while processing',
      );
    });
  });
});
