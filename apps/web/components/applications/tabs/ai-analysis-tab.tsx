'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Application, JobAnalysisForApplication, EnqueuedJob } from '@kariro/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAiPolling } from '@/lib/use-ai-polling';
import type { AiAnalysis } from '@kariro/shared';
import type { JobAnalysisResult } from '@kariro/shared';

interface AiAnalysisTabProps {
  readonly application: Application;
  readonly initialAnalysis: JobAnalysisForApplication | null;
  readonly onApplyExtractedData: (data: Partial<Application>) => void;
}

function FitScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="104" height="104" viewBox="0 0 104 104" aria-label={`Fit score: ${score}%`}>
        <circle cx="52" cy="52" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 52 52)"
        />
        <text x="52" y="52" textAnchor="middle" dominantBaseline="middle" className="text-lg font-bold" fontSize="22" fill={color}>
          {score}%
        </text>
      </svg>
      <span className="text-xs text-muted-foreground">Fit Score</span>
    </div>
  );
}

export function AiAnalysisTab({ application, initialAnalysis, onApplyExtractedData }: AiAnalysisTabProps) {
  const [analysis, setAnalysis] = useState<JobAnalysisForApplication | null>(initialAnalysis);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const polling = useAiPolling();

  async function handleAnalyze() {
    setIsAnalyzing(true);
    const res = await apiClient<EnqueuedJob>('/ai/analyze-job', {
      method: 'POST',
      body: {
        applicationId: application.id,
        jobDescription: application.jobDescription ?? undefined,
        jobUrl: application.jobUrl ?? undefined,
      },
    });
    if (!res.success || !res.data) {
      toast.error(res.error ?? 'Failed to start analysis');
      setIsAnalyzing(false);
      return;
    }
    polling.start(res.data.jobId, {
      onComplete: (raw) => {
        const content = (raw as AiAnalysis).result as JobAnalysisResult | null;
        if (content) {
          setAnalysis({
            id: raw.id,
            applicationId: raw.applicationId,
            jobId: raw.jobId,
            content,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
          });
        }
        setIsAnalyzing(false);
        polling.reset();
      },
      onFailed: (error) => {
        toast.error(error ?? 'Analysis failed. Please try again.');
        setIsAnalyzing(false);
        polling.reset();
      },
    });
  }

  function handleApplyData(content: JobAnalysisForApplication['content']) {
    onApplyExtractedData({
      companyName: content.companyName,
      roleTitle: content.roleTitle,
      location: content.location ?? undefined,
      workMode: content.workMode ?? undefined,
      salaryMin: content.salaryRange?.min ?? undefined,
      salaryMax: content.salaryRange?.max ?? undefined,
      salaryCurrency: content.salaryRange?.currency ?? undefined,
    });
  }

  if (!analysis && !isAnalyzing) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-muted-foreground text-sm max-w-xs">
          Analyze the job posting to get a fit score, skill gap analysis, and structured data extraction.
        </p>
        <Button onClick={handleAnalyze} disabled={!application.jobDescription && !application.jobUrl}>
          Analyze Job
        </Button>
        {!application.jobDescription && !application.jobUrl && (
          <p className="text-xs text-muted-foreground">Add a job URL or description to enable analysis.</p>
        )}
      </div>
    );
  }

  if (isAnalyzing || polling.status === 'processing') {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Analyzing job posting…</p>
      </div>
    );
  }

  if (!analysis) return null;

  const { content } = analysis;

  return (
    <div className="space-y-6">
      {/* Score + Summary */}
      <div className="flex gap-6 items-start">
        <FitScoreRing score={content.fitScore} />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">{content.fitExplanation}</p>
          <p className="text-sm text-muted-foreground">{content.summary}</p>
        </div>
      </div>

      {/* Apply Extracted Data */}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => handleApplyData(content)}>
        <RefreshCw className="size-3" /> Apply Extracted Data
      </Button>

      {/* Skills */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Required Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {content.requiredSkills.map((s) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Nice-to-Have</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {content.niceToHaveSkills.map((s) => (
                <Badge key={s} variant="outline">{s}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Missing Skills */}
      {content.missingSkills.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Missing Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {content.missingSkills.map((s) => (
                <Badge key={s} variant="destructive">{s}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Responsibilities */}
      {content.keyResponsibilities.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Key Responsibilities</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {content.keyResponsibilities.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Red Flags */}
      {content.redFlags.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-amber-800">
              <AlertTriangle className="size-4" /> Red Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-amber-700">
              {content.redFlags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={isAnalyzing}>
        Regenerate Analysis
      </Button>
    </div>
  );
}
