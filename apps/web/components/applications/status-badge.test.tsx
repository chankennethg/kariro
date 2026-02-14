import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { applicationStatuses } from '@kariro/shared';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it.each(applicationStatuses)('renders the %s status with correct label', (status) => {
    render(<StatusBadge status={status} />);

    const expected = status.charAt(0).toUpperCase() + status.slice(1);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('applies the correct color class for applied status', () => {
    const { container } = render(<StatusBadge status="applied" />);

    const badge = container.querySelector('[data-slot="badge"]')!;
    expect(badge).toHaveTextContent('Applied');
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-700');
  });

  it('applies the correct color class for rejected status', () => {
    const { container } = render(<StatusBadge status="rejected" />);

    const badge = container.querySelector('[data-slot="badge"]')!;
    expect(badge).toHaveTextContent('Rejected');
    expect(badge).toHaveClass('bg-red-100', 'text-red-700');
  });

  it('applies the correct color class for offer status', () => {
    const { container } = render(<StatusBadge status="offer" />);

    const badge = container.querySelector('[data-slot="badge"]')!;
    expect(badge).toHaveTextContent('Offer');
    expect(badge).toHaveClass('bg-green-100', 'text-green-700');
  });
});
