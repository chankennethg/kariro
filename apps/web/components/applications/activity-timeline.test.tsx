import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Application, CoverLetter, InterviewPrepResponse, ResumeGapResponse, JobAnalysisForApplication } from '@kariro/shared';
import { ActivityTimeline } from './activity-timeline';

const mockApplication: Application = {
  id: 'app-1',
  userId: 'user-1',
  companyName: 'Acme Corp',
  roleTitle: 'Software Engineer',
  jobUrl: null,
  jobDescription: null,
  status: 'applied',
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  location: null,
  workMode: null,
  notes: null,
  appliedAt: null,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

describe('ActivityTimeline', () => {
  it('always renders the "Application added" event', () => {
    render(
      <ActivityTimeline
        application={mockApplication}
        aiAnalysis={null}
        coverLetters={[]}
        interviewPrep={null}
        resumeGap={null}
      />,
    );

    expect(screen.getByText('Application added')).toBeInTheDocument();
  });

  it('renders "Application updated" when updatedAt is more than 1 minute after createdAt', () => {
    const app = {
      ...mockApplication,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:05:00.000Z', // 5 minutes later
    };

    render(
      <ActivityTimeline
        application={app}
        aiAnalysis={null}
        coverLetters={[]}
        interviewPrep={null}
        resumeGap={null}
      />,
    );

    expect(screen.getByText('Application updated')).toBeInTheDocument();
  });

  it('does not render "Application updated" when updatedAt is within 1 minute of createdAt', () => {
    const app = {
      ...mockApplication,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:30.000Z', // 30 seconds later
    };

    render(
      <ActivityTimeline
        application={app}
        aiAnalysis={null}
        coverLetters={[]}
        interviewPrep={null}
        resumeGap={null}
      />,
    );

    expect(screen.queryByText('Application updated')).not.toBeInTheDocument();
  });

  it('renders AI analysis event when aiAnalysis is provided', () => {
    const aiAnalysis = {
      id: 'ai-1',
      applicationId: 'app-1',
      jobId: 'job-1',
      content: {} as JobAnalysisForApplication['content'],
      createdAt: '2026-01-02T10:00:00.000Z',
      updatedAt: '2026-01-02T10:00:00.000Z',
    };

    render(
      <ActivityTimeline
        application={mockApplication}
        aiAnalysis={aiAnalysis}
        coverLetters={[]}
        interviewPrep={null}
        resumeGap={null}
      />,
    );

    expect(screen.getByText('AI job analysis completed')).toBeInTheDocument();
  });

  it('renders "Cover letter generated" for a single cover letter', () => {
    const letter: CoverLetter = {
      id: 'cl-1',
      applicationId: 'app-1',
      userId: 'user-1',
      jobId: 'job-1',
      tone: 'formal',
      content: 'Dear Hiring Manager...',
      createdAt: '2026-01-03T10:00:00.000Z',
      updatedAt: '2026-01-03T10:00:00.000Z',
    };

    render(
      <ActivityTimeline
        application={mockApplication}
        aiAnalysis={null}
        coverLetters={[letter]}
        interviewPrep={null}
        resumeGap={null}
      />,
    );

    expect(screen.getByText('Cover letter generated')).toBeInTheDocument();
  });

  it('renders plural cover letter count for multiple cover letters', () => {
    const makeLetterAtTime = (id: string, time: string): CoverLetter => ({
      id,
      applicationId: 'app-1',
      userId: 'user-1',
      jobId: 'job-1',
      tone: 'formal',
      content: 'Dear Hiring Manager...',
      createdAt: time,
      updatedAt: time,
    });

    render(
      <ActivityTimeline
        application={mockApplication}
        aiAnalysis={null}
        coverLetters={[
          makeLetterAtTime('cl-1', '2026-01-03T09:00:00.000Z'),
          makeLetterAtTime('cl-2', '2026-01-03T10:00:00.000Z'),
          makeLetterAtTime('cl-3', '2026-01-03T11:00:00.000Z'),
        ]}
        interviewPrep={null}
        resumeGap={null}
      />,
    );

    expect(screen.getByText('3 cover letters generated')).toBeInTheDocument();
  });

  it('renders interview prep event', () => {
    const prep: InterviewPrepResponse = {
      id: 'ip-1',
      applicationId: 'app-1',
      userId: 'user-1',
      jobId: 'job-1',
      content: {} as InterviewPrepResponse['content'],
      createdAt: '2026-01-04T10:00:00.000Z',
      updatedAt: '2026-01-04T10:00:00.000Z',
    };

    render(
      <ActivityTimeline
        application={mockApplication}
        aiAnalysis={null}
        coverLetters={[]}
        interviewPrep={prep}
        resumeGap={null}
      />,
    );

    expect(screen.getByText('Interview prep generated')).toBeInTheDocument();
  });

  it('renders resume gap event', () => {
    const gap: ResumeGapResponse = {
      id: 'rg-1',
      applicationId: 'app-1',
      userId: 'user-1',
      jobId: 'job-1',
      content: {} as ResumeGapResponse['content'],
      createdAt: '2026-01-05T10:00:00.000Z',
      updatedAt: '2026-01-05T10:00:00.000Z',
    };

    render(
      <ActivityTimeline
        application={mockApplication}
        aiAnalysis={null}
        coverLetters={[]}
        interviewPrep={null}
        resumeGap={gap}
      />,
    );

    expect(screen.getByText('Resume gap analyzed')).toBeInTheDocument();
  });

  it('does not render "No activity" when there are events', () => {
    render(
      <ActivityTimeline
        application={mockApplication}
        aiAnalysis={null}
        coverLetters={[]}
        interviewPrep={null}
        resumeGap={null}
      />,
    );

    // "Application added" is always present, so it's not empty
    expect(screen.queryByText('No activity yet.')).not.toBeInTheDocument();
  });
});
