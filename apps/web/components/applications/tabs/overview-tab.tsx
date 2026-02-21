'use client';

import { useState } from 'react';
import type { Application, Tag } from '@kariro/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { workModeLabels } from '@/lib/constants';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface OverviewTabProps {
  readonly application: Application;
  readonly tags: Tag[];
}

export function OverviewTab({ application, tags }: OverviewTabProps) {
  const [showFullDescription, setShowFullDescription] = useState(false);

  const salary = (() => {
    if (!application.salaryMin && !application.salaryMax) return null;
    const currency = application.salaryCurrency ?? 'USD';
    if (application.salaryMin && application.salaryMax) {
      return `${application.salaryMin.toLocaleString()} – ${application.salaryMax.toLocaleString()} ${currency}`;
    }
    return `${(application.salaryMin ?? application.salaryMax)!.toLocaleString()} ${currency}`;
  })();

  return (
    <div className="space-y-6">
      {/* Job Details */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Job Details
        </h3>
        <dl className="grid gap-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-32 shrink-0 text-muted-foreground">Company</dt>
            <dd className="font-medium">{application.companyName}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-32 shrink-0 text-muted-foreground">Role</dt>
            <dd className="font-medium">{application.roleTitle}</dd>
          </div>
          {application.location && (
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 text-muted-foreground">Location</dt>
              <dd>{application.location}</dd>
            </div>
          )}
          {application.workMode && (
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 text-muted-foreground">Work Mode</dt>
              <dd>{workModeLabels[application.workMode]}</dd>
            </div>
          )}
          {salary && (
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 text-muted-foreground">Salary</dt>
              <dd>{salary}</dd>
            </div>
          )}
          {application.appliedAt && (
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 text-muted-foreground">Applied</dt>
              <dd>{new Date(application.appliedAt).toLocaleDateString()}</dd>
            </div>
          )}
          {application.jobUrl && /^https?:\/\//i.test(application.jobUrl) && (
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 text-muted-foreground">Job URL</dt>
              <dd>
                <a
                  href={application.jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  View posting <ExternalLink className="size-3" />
                </a>
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Tags */}
      {tags.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Tags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                style={tag.color ? { backgroundColor: `${tag.color}22`, color: tag.color, borderColor: `${tag.color}44` } : undefined}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Notes */}
      {application.notes && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Notes
          </h3>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{application.notes}</p>
        </section>
      )}

      {/* Job Description */}
      {application.jobDescription && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Job Description
          </h3>
          <div
            className={`overflow-hidden text-sm text-muted-foreground whitespace-pre-wrap transition-all ${
              showFullDescription ? '' : 'max-h-40'
            }`}
          >
            {application.jobDescription}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFullDescription((v) => !v)}
            className="h-7 gap-1 text-xs"
          >
            {showFullDescription ? (
              <>
                <ChevronUp className="size-3" /> Show less
              </>
            ) : (
              <>
                <ChevronDown className="size-3" /> Show full description
              </>
            )}
          </Button>
        </section>
      )}
    </div>
  );
}
