import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Application } from '@kariro/shared';
import { ApplicationDeleteDialog } from './application-delete-dialog';

const mockApplication: Application = {
  id: '123',
  userId: 'user-1',
  companyName: 'Acme Corp',
  roleTitle: 'Software Engineer',
  jobUrl: null,
  jobDescription: null,
  status: 'applied',
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  location: null,
  workMode: null,
  notes: null,
  appliedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ApplicationDeleteDialog', () => {
  it('displays company name and role title in confirmation message', () => {
    render(
      <ApplicationDeleteDialog
        application={mockApplication}
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isDeleting={false}
      />,
    );

    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('calls onConfirm when Delete button is clicked', async () => {
    const onConfirm = vi.fn();
    render(
      <ApplicationDeleteDialog
        application={mockApplication}
        open
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        isDeleting={false}
      />,
    );

    await userEvent.click(screen.getByText('Delete'));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('shows Deleting... text when isDeleting is true', () => {
    render(
      <ApplicationDeleteDialog
        application={mockApplication}
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isDeleting
      />,
    );

    expect(screen.getByText('Deleting...')).toBeInTheDocument();
  });

  it('disables buttons when isDeleting is true', () => {
    render(
      <ApplicationDeleteDialog
        application={mockApplication}
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isDeleting
      />,
    );

    expect(screen.getByText('Deleting...')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('does not render content when not open', () => {
    render(
      <ApplicationDeleteDialog
        application={mockApplication}
        open={false}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isDeleting={false}
      />,
    );

    expect(screen.queryByText('Delete application?')).not.toBeInTheDocument();
  });
});
