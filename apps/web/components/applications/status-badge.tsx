import type { ApplicationStatus } from '@kariro/shared';
import { Badge } from '@/components/ui/badge';

const statusConfig: Record<ApplicationStatus, { label: string; className: string }> = {
  saved: { label: 'Saved', className: 'bg-gray-100 text-gray-700 hover:bg-gray-100' },
  applied: { label: 'Applied', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  screening: { label: 'Screening', className: 'bg-purple-100 text-purple-700 hover:bg-purple-100' },
  interview: { label: 'Interview', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
  offer: { label: 'Offer', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  withdrawn: { label: 'Withdrawn', className: 'bg-slate-100 text-slate-700 hover:bg-slate-100' },
};

interface StatusBadgeProps {
  readonly status: ApplicationStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
