'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { InterviewPrepResponse, EnqueuedJob } from '@kariro/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAiPolling } from '@/lib/use-ai-polling';

const difficultyConfig = {
  easy: { label: 'Easy', className: 'bg-green-100 text-green-700' },
  medium: { label: 'Medium', className: 'bg-amber-100 text-amber-700' },
  hard: { label: 'Hard', className: 'bg-red-100 text-red-700' },
};

interface InterviewPrepTabProps {
  readonly applicationId: string;
  readonly initialPrep: InterviewPrepResponse | null;
}

export function InterviewPrepTab({ applicationId, initialPrep }: InterviewPrepTabProps) {
  const [prep, setPrep] = useState<InterviewPrepResponse | null>(initialPrep);
  const [isGenerating, setIsGenerating] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const polling = useAiPolling();

  async function handleGenerate() {
    setIsGenerating(true);
    const res = await apiClient<EnqueuedJob>('/ai/interview-prep', {
      method: 'POST',
      body: { applicationId },
    });
    if (!res.success || !res.data) {
      toast.error(res.error ?? 'Failed to start generation');
      setIsGenerating(false);
      return;
    }
    polling.start(res.data.jobId, {
      onComplete: async () => {
        const prepRes = await apiClient<InterviewPrepResponse | null>(
          `/applications/${applicationId}/interview-prep`,
        );
        if (prepRes.success && prepRes.data) {
          setPrep(prepRes.data);
        }
        setIsGenerating(false);
        polling.reset();
        toast.success('Interview prep generated');
      },
      onFailed: (error) => {
        toast.error(error ?? 'Generation failed. Please try again.');
        setIsGenerating(false);
        polling.reset();
      },
    });
  }

  function toggleCheck(index: number) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  if (!prep && !isGenerating) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-sm text-muted-foreground max-w-xs">
          Generate AI-powered interview preparation materials tailored to this role.
        </p>
        <Button onClick={handleGenerate}>Generate Interview Prep</Button>
      </div>
    );
  }

  if (isGenerating || polling.status === 'processing') {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Generating interview prep…</p>
      </div>
    );
  }

  if (!prep) return null;

  const { content } = prep;

  return (
    <div className="space-y-6">
      {/* Technical Questions */}
      {content.technicalQuestions.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Technical Questions</h3>
          <Accordion type="multiple" className="space-y-1">
            {content.technicalQuestions.map((q, i) => (
              <AccordionItem key={i} value={`tech-${i}`} className="border rounded-lg px-3">
                <AccordionTrigger className="text-sm py-3 hover:no-underline">
                  <span className="flex items-center gap-2 text-left">
                    <Badge
                      variant="secondary"
                      className={difficultyConfig[q.difficulty].className}
                    >
                      {difficultyConfig[q.difficulty].label}
                    </Badge>
                    {q.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-3">
                  {q.suggestedAnswer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {/* Behavioral Questions */}
      {content.behavioralQuestions.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Behavioral Questions</h3>
          <Accordion type="multiple" className="space-y-1">
            {content.behavioralQuestions.map((q, i) => (
              <AccordionItem key={i} value={`beh-${i}`} className="border rounded-lg px-3">
                <AccordionTrigger className="text-sm py-3 hover:no-underline text-left">
                  {q.question}
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm pb-3">
                  <p className="text-muted-foreground">{q.suggestedAnswer}</p>
                  {q.tip && (
                    <p className="text-xs italic text-muted-foreground border-l-2 pl-2">
                      Tip: {q.tip}
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {/* Questions to Ask */}
      {content.questionsToAsk.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Questions to Ask</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {content.questionsToAsk.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Company Research Tips */}
      {content.companyResearchTips.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Company Research Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {content.companyResearchTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Preparation Checklist */}
      {content.preparationChecklist.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Preparation Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {content.preparationChecklist.map((item, i) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    id={`checklist-${i}`}
                    checked={checkedItems.has(i)}
                    onChange={() => toggleCheck(i)}
                    className="size-4 rounded border-gray-300 cursor-pointer"
                  />
                  <label
                    htmlFor={`checklist-${i}`}
                    className={`cursor-pointer ${checkedItems.has(i) ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {item}
                  </label>
                </li>
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
