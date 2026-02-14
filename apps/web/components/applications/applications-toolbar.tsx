'use client';

import { applicationStatuses } from '@kariro/shared';
import type { ApplicationStatus } from '@kariro/shared';
import { Search, Plus, Tags } from 'lucide-react';
import { statusLabels } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ApplicationsToolbarProps {
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly statusFilter: ApplicationStatus | 'all';
  readonly onStatusFilterChange: (value: ApplicationStatus | 'all') => void;
  readonly onNewApplication: () => void;
  readonly onManageTags: () => void;
}

export function ApplicationsToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onNewApplication,
  onManageTags,
}: ApplicationsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search company or role..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => onStatusFilterChange(v as ApplicationStatus | 'all')}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {applicationStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {statusLabels[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onManageTags}>
          <Tags className="mr-1.5 size-4" />
          Manage Tags
        </Button>
        <Button size="sm" onClick={onNewApplication}>
          <Plus className="mr-1.5 size-4" />
          New Application
        </Button>
      </div>
    </div>
  );
}
