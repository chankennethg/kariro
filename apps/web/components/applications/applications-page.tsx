'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Application, ApplicationStatus, Tag, CreateApplication } from '@kariro/shared';
import { applicationStatuses } from '@kariro/shared';
import { MoreHorizontal } from 'lucide-react';
import { apiClient, apiClientCursor } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { statusLabels, workModeLabels } from '@/lib/constants';
import { useDebounce } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ApplicationsToolbar } from './applications-toolbar';
import { ApplicationFormDialog } from './application-form-dialog';
import { ApplicationDeleteDialog } from './application-delete-dialog';
import { TagListDialog } from './tag-list-dialog';
import { TagManager } from './tag-manager';
import { StatusBadge } from './status-badge';

export function ApplicationsPage() {
  const { isLoading: isAuthLoading } = useAuth();

  // Data
  const [applications, setApplications] = useState<Application[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const debouncedSearch = useDebounce(search, 300);

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [deletingApp, setDeletingApp] = useState<Application | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [taggingAppId, setTaggingAppId] = useState<string | null>(null);
  const [isTagListOpen, setIsTagListOpen] = useState(false);

  // Fetch applications
  const fetchApplications = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (cursor) params.set('cursor', cursor);

      const qs = params.toString();
      return apiClientCursor<Application>(`/applications${qs ? `?${qs}` : ''}`);
    },
    [statusFilter, debouncedSearch],
  );

  // Initial load + filter changes (wait for auth to restore session first)
  useEffect(() => {
    if (isAuthLoading) return;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchApplications();
        if (cancelled) return;
        if (res.success) {
          setApplications([...res.data]);
          setNextCursor(res.meta.nextCursor);
          setHasMore(res.meta.hasMore);
        } else {
          setError(res.error ?? 'Failed to load applications');
        }
      } catch {
        if (!cancelled) setError('Failed to load applications');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, fetchApplications]);

  // Fetch tags (wait for auth to restore session first)
  useEffect(() => {
    if (isAuthLoading) return;

    let cancelled = false;

    async function loadTags() {
      try {
        const res = await apiClient<Tag[]>('/tags');
        if (!cancelled && res.success && res.data) {
          setTags([...res.data]);
        }
      } catch {
        // Tag fetch failure is non-critical — tags are optional UI
      }
    }

    loadTags();
    return () => {
      cancelled = true;
    };
  }, [isAuthLoading]);

  // Load more
  async function handleLoadMore() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetchApplications(nextCursor);
      if (res.success) {
        setApplications((prev) => [...prev, ...res.data]);
        setNextCursor(res.meta.nextCursor);
        setHasMore(res.meta.hasMore);
      } else {
        setError(res.error ?? 'Failed to load more applications');
      }
    } catch {
      setError('Failed to load more applications');
    } finally {
      setIsLoadingMore(false);
    }
  }

  // Create application
  async function handleCreate(data: CreateApplication) {
    try {
      const res = await apiClient<Application>('/applications', {
        method: 'POST',
        body: data,
      });
      if (res.success && res.data) {
        const created = res.data;
        setApplications((prev) => [created, ...prev]);
        setIsCreateOpen(false);
      } else {
        setError(res.error ?? 'Failed to create application');
      }
    } catch {
      setError('Failed to create application');
    }
  }

  // Update application
  async function handleUpdate(data: CreateApplication) {
    if (!editingApp) return;
    try {
      const res = await apiClient<Application>(`/applications/${editingApp.id}`, {
        method: 'PATCH',
        body: data,
      });
      if (res.success && res.data) {
        const updated = res.data;
        setApplications((prev) => prev.map((a) => (a.id === editingApp.id ? updated : a)));
        setEditingApp(null);
      } else {
        setError(res.error ?? 'Failed to update application');
      }
    } catch {
      setError('Failed to update application');
    }
  }

  // Delete application
  async function handleDelete() {
    if (!deletingApp) return;
    setIsDeleting(true);
    try {
      const res = await apiClient<null>(`/applications/${deletingApp.id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setApplications((prev) => prev.filter((a) => a.id !== deletingApp.id));
        setDeletingApp(null);
      } else {
        setError(res.error ?? 'Failed to delete application');
      }
    } catch {
      setError('Failed to delete application');
    } finally {
      setIsDeleting(false);
    }
  }

  // Change status inline
  async function handleStatusChange(appId: string, status: ApplicationStatus) {
    try {
      const res = await apiClient<Application>(`/applications/${appId}/status`, {
        method: 'PATCH',
        body: { status },
      });
      if (res.success && res.data) {
        const updated = res.data;
        setApplications((prev) => prev.map((a) => (a.id === appId ? updated : a)));
      } else {
        setError(res.error ?? 'Failed to update status');
      }
    } catch {
      setError('Failed to update status');
    }
  }

  // Tag operations
  async function handleCreateTag(name: string, color?: string) {
    try {
      const res = await apiClient<Tag>('/tags', {
        method: 'POST',
        body: { name, color },
      });
      if (res.success && res.data) {
        const created = res.data;
        setTags((prev) => [...prev, created]);
      } else {
        setError(res.error ?? 'Failed to create tag');
      }
    } catch {
      setError('Failed to create tag');
    }
  }

  async function handleDeleteTag(tagId: string) {
    try {
      const res = await apiClient<null>(`/tags/${tagId}`, { method: 'DELETE' });
      if (res.success) {
        setTags((prev) => prev.filter((t) => t.id !== tagId));
      } else {
        setError(res.error ?? 'Failed to delete tag');
      }
    } catch {
      setError('Failed to delete tag');
    }
  }

  async function handleAttachTags(applicationId: string, tagIds: string[]) {
    try {
      const res = await apiClient<{ attached: number }>(
        `/applications/${applicationId}/tags`,
        { method: 'POST', body: { tagIds } },
      );
      if (!res.success) {
        setError(res.error ?? 'Failed to attach tags');
      }
    } catch {
      setError('Failed to attach tags');
    }
  }

  async function handleRemoveTag(applicationId: string, tagId: string) {
    try {
      const res = await apiClient<null>(
        `/applications/${applicationId}/tags/${tagId}`,
        { method: 'DELETE' },
      );
      if (!res.success) {
        setError(res.error ?? 'Failed to remove tag');
      }
    } catch {
      setError('Failed to remove tag');
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
        <p className="text-sm text-muted-foreground">Track and manage your job applications.</p>
      </div>

      <ApplicationsToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onNewApplication={() => setIsCreateOpen(true)}
        onManageTags={() => setIsTagListOpen(true)}
      />

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <TableHead className="hidden md:table-cell">Work Mode</TableHead>
              <TableHead className="hidden sm:table-cell">Applied</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-24 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-28 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="h-4 w-16 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell className="hidden md:table-cell"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell className="hidden md:table-cell"><div className="h-4 w-16 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
                  <TableCell><div className="size-4 animate-pulse rounded bg-muted" /></TableCell>
                </TableRow>
              ))
            ) : applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {debouncedSearch || statusFilter !== 'all'
                    ? 'No applications match your filters.'
                    : 'No applications yet. Click "New Application" to add one.'}
                </TableCell>
              </TableRow>
            ) : (
              applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.companyName}</TableCell>
                  <TableCell>{app.roleTitle}</TableCell>
                  <TableCell>
                    <StatusBadge status={app.status} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {app.location ?? '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {app.workMode ? workModeLabels[app.workMode] : '—'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatDate(app.appliedAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="size-8 p-0">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingApp(app)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {applicationStatuses.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                disabled={s === app.status}
                                onClick={() => handleStatusChange(app.id, s)}
                              >
                                {statusLabels[s]}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuItem onClick={() => setTaggingAppId(app.id)}>
                          Tags
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeletingApp(app)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}

      <ApplicationFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
      />

      <ApplicationFormDialog
        open={editingApp !== null}
        onOpenChange={(open) => {
          if (!open) setEditingApp(null);
        }}
        onSubmit={handleUpdate}
        application={editingApp}
      />

      <ApplicationDeleteDialog
        application={deletingApp}
        open={deletingApp !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingApp(null);
        }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      <TagListDialog
        open={isTagListOpen}
        onOpenChange={setIsTagListOpen}
        tags={tags}
        onCreateTag={handleCreateTag}
        onDeleteTag={handleDeleteTag}
      />

      {taggingAppId !== null && (
        <TagManager
          open
          onOpenChange={(open) => {
            if (!open) setTaggingAppId(null);
          }}
          applicationId={taggingAppId}
          tags={tags}
          onAttachTags={handleAttachTags}
          onRemoveTag={handleRemoveTag}
        />
      )}
    </div>
  );
}
