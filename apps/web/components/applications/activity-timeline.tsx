'use client';

import type { Application, CoverLetter, InterviewPrepResponse, ResumeGapResponse, JobAnalysisForApplication } from '@kariro/shared';
import { Brain, Mail, MessageSquare, BarChart2, Clock, Plus } from 'lucide-react';

interface TimelineEvent {
  at: Date;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

interface ActivityTimelineProps {
  readonly application: Application;
  readonly aiAnalysis: JobAnalysisForApplication | null;
  readonly coverLetters: CoverLetter[];
  readonly interviewPrep: InterviewPrepResponse | null;
  readonly resumeGap: ResumeGapResponse | null;
}

export function ActivityTimeline({
  application,
  aiAnalysis,
  coverLetters,
  interviewPrep,
  resumeGap,
}: ActivityTimelineProps) {
  const events: TimelineEvent[] = [];

  events.push({
    at: new Date(application.createdAt),
    label: 'Application added',
    icon: Plus,
  });

  // Last updated (if > 1 min after created)
  const createdAt = new Date(application.createdAt);
  const updatedAt = new Date(application.updatedAt);
  if (updatedAt.getTime() - createdAt.getTime() > 60000) {
    events.push({
      at: updatedAt,
      label: 'Application updated',
      icon: Clock,
    });
  }

  if (aiAnalysis) {
    events.push({
      at: new Date(aiAnalysis.createdAt),
      label: 'AI job analysis completed',
      icon: Brain,
    });
  }

  if (coverLetters.length > 0) {
    const latest = coverLetters.reduce((a, b) =>
      new Date(a.createdAt) > new Date(b.createdAt) ? a : b,
    );
    const label = coverLetters.length === 1
      ? 'Cover letter generated'
      : `${coverLetters.length} cover letters generated`;
    events.push({
      at: new Date(latest.createdAt),
      label,
      icon: Mail,
    });
  }

  if (interviewPrep) {
    events.push({
      at: new Date(interviewPrep.createdAt),
      label: 'Interview prep generated',
      icon: MessageSquare,
    });
  }

  if (resumeGap) {
    events.push({
      at: new Date(resumeGap.createdAt),
      label: 'Resume gap analyzed',
      icon: BarChart2,
    });
  }

  // Sort newest first (immutable)
  const sorted = [...events].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Activity
      </h3>
      {sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground">No activity yet.</p>
      ) : (
        <ol className="relative border-l border-muted ml-2 space-y-4">
          {sorted.map((event) => {
            const Icon = event.icon;
            return (
              <li key={`${event.label}-${event.at.getTime()}`} className="ml-4">
                <span className="absolute -left-[9px] flex size-[18px] items-center justify-center rounded-full bg-muted">
                  <Icon className="size-2.5 text-muted-foreground" />
                </span>
                <p className="text-xs font-medium">{event.label}</p>
                <time className="text-[11px] text-muted-foreground">{relativeTime(event.at)}</time>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

