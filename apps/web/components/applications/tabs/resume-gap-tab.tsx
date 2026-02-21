'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { ResumeGapResponse, EnqueuedJob } from '@kariro/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAiPolling } from '@/lib/use-ai-polling';

interface ResumeGapTabProps {
  readonly applicationId: string;
  readonly initialAnalysis: ResumeGapResponse | null;
}

export function ResumeGapTab({ applicationId, initialAnalysis }: ResumeGapTabProps) {
  const [analysis, setAnalysis] = useState<ResumeGapResponse | null>(initialAnalysis);
  const [isGenerating, setIsGenerating] = useState(false);
  const polling = useAiPolling();

  async function handleGenerate() {
    setIsGenerating(true);
    const res = await apiClient<EnqueuedJob>('/ai/resume-gap', {
      method: 'POST',
      body: { applicationId },
    });
    if (!res.success || !res.data) {
      toast.error(res.error ?? 'Failed to start analysis');
      setIsGenerating(false);
      return;
    }
    polling.start(res.data.jobId, {
      onComplete: async () => {
        const gapRes = await apiClient<ResumeGapResponse | null>(
          `/applications/${applicationId}/resume-gap`,
        );
        if (gapRes.success && gapRes.data) {
          setAnalysis(gapRes.data);
        }
        setIsGenerating(false);
        polling.reset();
        toast.success('Resume gap analysis complete');
      },
      onFailed: (error) => {
        toast.error(error ?? 'Analysis failed. Please try again.');
        setIsGenerating(false);
        polling.reset();
      },
    });
  }

  if (!analysis && !isGenerating) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-sm text-muted-foreground max-w-xs">
          Compare your resume against the job requirements to find skill gaps and get improvement suggestions.
        </p>
        <Button onClick={handleGenerate}>Analyze Resume Gap</Button>
      </div>
    );
  }

  if (isGenerating || polling.status === 'processing') {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Analyzing resume gap…</p>
      </div>
    );
  }

  if (!analysis) return null;

  const { content } = analysis;
  const requiredMissing = content.missingSkills.filter((s) => s.importance === 'required');
  const niceToHaveMissing = content.missingSkills.filter((s) => s.importance === 'nice-to-have');

  return (
    <div className="space-y-6">
      {/* Overall Match */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold">{content.overallMatch}%</span>
          <span className="text-sm text-muted-foreground">Overall Match</span>
        </div>
        <Progress value={content.overallMatch} className="h-2" />
      </div>

      {/* Matched Skills */}
      {content.matchedSkills.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Matched Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {content.matchedSkills.map((s) => (
              <div key={s.skill} className="space-y-0.5">
                <Badge variant="secondary" className="bg-green-100 text-green-700">{s.skill}</Badge>
                <p className="text-xs text-muted-foreground pl-1">{s.evidenceFromResume}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Required Missing */}
      {requiredMissing.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Missing Required Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requiredMissing.map((s) => (
              <div key={s.skill} className="space-y-0.5">
                <Badge variant="destructive">{s.skill}</Badge>
                <p className="text-xs text-muted-foreground pl-1">{s.suggestion}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Nice-to-Have Missing */}
      {niceToHaveMissing.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Missing Nice-to-Have Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {niceToHaveMissing.map((s) => (
              <div key={s.skill} className="space-y-0.5">
                <Badge variant="secondary" className="bg-amber-100 text-amber-700">{s.skill}</Badge>
                <p className="text-xs text-muted-foreground pl-1">{s.suggestion}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Resume Suggestions */}
      {content.resumeSuggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resume Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              {content.resumeSuggestions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Talking Points */}
      {content.talkingPoints.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Talking Points</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {content.talkingPoints.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
        Regenerate
      </Button>
    </div>
  );
}
