'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type {
  Application,
  Tag,
  CoverLetter,
  InterviewPrepResponse,
  ResumeGapResponse,
  JobAnalysisForApplication,
  CreateApplication,
} from '@kariro/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './status-badge';
import { ApplicationFormDialog } from './application-form-dialog';
import { ApplicationDeleteDialog } from './application-delete-dialog';
import { OverviewTab } from './tabs/overview-tab';
import { AiAnalysisTab } from './tabs/ai-analysis-tab';
import { CoverLettersTab } from './tabs/cover-letters-tab';
import { InterviewPrepTab } from './tabs/interview-prep-tab';
import { ResumeGapTab } from './tabs/resume-gap-tab';
import { ActivityTimeline } from './activity-timeline';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface ApplicationDetailPageProps {
  readonly applicationId: string;
}

interface DetailData {
  application: Application;
  tags: Tag[];
  coverLetters: CoverLetter[];
  interviewPrep: InterviewPrepResponse | null;
  resumeGap: ResumeGapResponse | null;
  aiAnalysis: JobAnalysisForApplication | null;
}

export function ApplicationDetailPage({ applicationId }: ApplicationDetailPageProps) {
  const { isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<DetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editPrefill, setEditPrefill] = useState<Application | null>(null);

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const fetchAll = useCallback(async () => {
    if (!UUID_RE.test(applicationId)) {
      router.push('/dashboard/applications');
      return;
    }

    const [appRes, tagsRes, lettersRes, prepRes, gapRes, aiRes] = await Promise.all([
      apiClient<Application>(`/applications/${applicationId}`),
      apiClient<Tag[]>(`/applications/${applicationId}/tags`),
      apiClient<CoverLetter[]>(`/applications/${applicationId}/cover-letters`),
      apiClient<InterviewPrepResponse | null>(`/applications/${applicationId}/interview-prep`),
      apiClient<ResumeGapResponse | null>(`/applications/${applicationId}/resume-gap`),
      apiClient<JobAnalysisForApplication | null>(`/applications/${applicationId}/ai-analysis`),
    ]);

    if (!appRes.success) {
      toast.error(appRes.error ?? 'Application not found');
      router.push('/dashboard/applications');
      return;
    }

    setData({
      application: appRes.data as Application,
      tags: tagsRes.success ? (tagsRes.data ?? []) : [],
      coverLetters: lettersRes.success ? (lettersRes.data ?? []) : [],
      interviewPrep: prepRes.success ? (prepRes.data ?? null) : null,
      resumeGap: gapRes.success ? (gapRes.data ?? null) : null,
      aiAnalysis: aiRes.success ? (aiRes.data ?? null) : null,
    });
    setIsLoading(false);
  }, [applicationId, router]);

  useEffect(() => {
    if (!authLoading) {
      void fetchAll();
    }
  }, [authLoading, fetchAll]);

  async function handleEdit(formData: CreateApplication) {
    const res = await apiClient<Application>(`/applications/${applicationId}`, {
      method: 'PATCH',
      body: formData,
    });
    if (!res.success) {
      toast.error(res.error ?? 'Failed to update application');
      return;
    }
    setData((prev) => prev && res.data ? { ...prev, application: res.data } : prev);
    setEditOpen(false);
    setEditPrefill(null);
    toast.success('Application updated');
  }

  async function handleDelete() {
    setIsDeleting(true);
    const res = await apiClient<null>(`/applications/${applicationId}`, { method: 'DELETE' });
    setIsDeleting(false);
    if (!res.success) {
      toast.error(res.error ?? 'Failed to delete application');
      return;
    }
    toast.success('Application deleted');
    router.push('/dashboard/applications');
  }

  function handleApplyExtractedData(extracted: Partial<Application>) {
    if (!data) return;
    // Merge AI-extracted data into the application for the edit dialog
    setEditPrefill({ ...data.application, ...extracted });
    setEditOpen(true);
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-4">
          <Skeleton className="h-80 flex-1" />
          <Skeleton className="h-80 w-72" />
        </div>
      </div>
    );
  }

  const { application, tags, coverLetters, interviewPrep, resumeGap, aiAnalysis } = data;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back link */}
      <Link
        href="/dashboard/applications"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeft className="size-4" /> Back to Applications
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{application.roleTitle}</h1>
            <StatusBadge status={application.status} />
          </div>
          <p className="text-muted-foreground">{application.companyName}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => {
              setEditPrefill(null);
              setEditOpen(true);
            }}
          >
            <Pencil className="size-3" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3" /> Delete
          </Button>
        </div>
      </div>

      {/* Main content + sidebar */}
      <div className="flex gap-6 items-start">
        {/* Tabs */}
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="ai-analysis">AI Analysis</TabsTrigger>
              <TabsTrigger value="cover-letters">Cover Letters</TabsTrigger>
              <TabsTrigger value="interview-prep">Interview Prep</TabsTrigger>
              <TabsTrigger value="resume-gap">Resume Gap</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <OverviewTab application={application} tags={tags} />
            </TabsContent>
            <TabsContent value="ai-analysis">
              <AiAnalysisTab
                application={application}
                initialAnalysis={aiAnalysis}
                onApplyExtractedData={handleApplyExtractedData}
              />
            </TabsContent>
            <TabsContent value="cover-letters">
              <CoverLettersTab applicationId={applicationId} initialLetters={coverLetters} />
            </TabsContent>
            <TabsContent value="interview-prep">
              <InterviewPrepTab applicationId={applicationId} initialPrep={interviewPrep} />
            </TabsContent>
            <TabsContent value="resume-gap">
              <ResumeGapTab applicationId={applicationId} initialAnalysis={resumeGap} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar: Activity Timeline */}
        <aside className="w-72 shrink-0">
          <ActivityTimeline
            application={application}
            aiAnalysis={aiAnalysis}
            coverLetters={coverLetters}
            interviewPrep={interviewPrep}
            resumeGap={resumeGap}
          />
        </aside>
      </div>

      {/* Dialogs */}
      <ApplicationFormDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditPrefill(null);
        }}
        onSubmit={handleEdit}
        application={editPrefill ?? application}
      />
      <ApplicationDeleteDialog
        application={application}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
