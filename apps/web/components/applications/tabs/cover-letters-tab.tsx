'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { CoverLetter, EnqueuedJob } from '@kariro/shared';
import { tones, type CoverLetterTone } from '@kariro/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAiPolling } from '@/lib/use-ai-polling';

const toneLabels: Record<CoverLetterTone, string> = {
  formal: 'Formal',
  conversational: 'Conversational',
  confident: 'Confident',
};

interface CoverLettersTabProps {
  readonly applicationId: string;
  readonly initialLetters: CoverLetter[];
}

function CoverLetterCard({ letter }: { letter: CoverLetter }) {
  const [expanded, setExpanded] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(letter.content);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{toneLabels[letter.tone]}</Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(letter.createdAt).toLocaleDateString()}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={handleCopy}>
          <Copy className="size-3" />
          <span className="sr-only">Copy</span>
        </Button>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <div className={expanded ? '' : 'line-clamp-4'}>
          {letter.content}
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          className="h-7 gap-1 text-xs"
        >
          {expanded ? (
            <><ChevronUp className="size-3" /> Show less</>
          ) : (
            <><ChevronDown className="size-3" /> Show full</>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function CoverLettersTab({ applicationId, initialLetters }: CoverLettersTabProps) {
  const [letters, setLetters] = useState<CoverLetter[]>(initialLetters);
  const [tone, setTone] = useState<CoverLetterTone>('formal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showToneSelector, setShowToneSelector] = useState(false);
  const polling = useAiPolling();

  async function handleGenerate() {
    setIsGenerating(true);
    const res = await apiClient<EnqueuedJob>('/ai/cover-letter', {
      method: 'POST',
      body: { applicationId, tone },
    });
    if (!res.success || !res.data) {
      toast.error(res.error ?? 'Failed to start generation');
      setIsGenerating(false);
      return;
    }
    polling.start(res.data.jobId, {
      onComplete: async () => {
        const lettersRes = await apiClient<CoverLetter[]>(
          `/applications/${applicationId}/cover-letters`,
        );
        if (lettersRes.success && lettersRes.data) {
          setLetters(lettersRes.data);
        }
        setIsGenerating(false);
        setShowToneSelector(false);
        polling.reset();
        toast.success('Cover letter generated');
      },
      onFailed: (error) => {
        toast.error(error ?? 'Generation failed. Please try again.');
        setIsGenerating(false);
        polling.reset();
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {letters.length} cover letter{letters.length !== 1 ? 's' : ''}
        </h3>
        {!showToneSelector && !isGenerating && (
          <Button size="sm" onClick={() => setShowToneSelector(true)}>
            Generate New
          </Button>
        )}
      </div>

      {showToneSelector && !isGenerating && (
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <Select value={tone} onValueChange={(v) => setTone(v as CoverLetterTone)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tones.map((t) => (
                <SelectItem key={t} value={t}>{toneLabels[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleGenerate}>Generate</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowToneSelector(false)}>Cancel</Button>
        </div>
      )}

      {isGenerating && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Generating cover letter…
        </div>
      )}

      {letters.length === 0 && !isGenerating ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No cover letters yet. Generate one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {letters.map((letter) => (
            <CoverLetterCard key={letter.id} letter={letter} />
          ))}
        </div>
      )}
    </div>
  );
}
