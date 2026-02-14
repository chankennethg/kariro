import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApplicationsToolbar } from './applications-toolbar';

describe('ApplicationsToolbar', () => {
  const defaultProps = {
    search: '',
    onSearchChange: vi.fn(),
    statusFilter: 'all' as const,
    onStatusFilterChange: vi.fn(),
    onNewApplication: vi.fn(),
    onManageTags: vi.fn(),
  };

  it('renders search input, status filter, and action buttons', () => {
    render(<ApplicationsToolbar {...defaultProps} />);

    expect(screen.getByPlaceholderText('Search company or role...')).toBeInTheDocument();
    expect(screen.getByText('Manage Tags')).toBeInTheDocument();
    expect(screen.getByText('New Application')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search input', async () => {
    const onSearchChange = vi.fn();
    render(<ApplicationsToolbar {...defaultProps} onSearchChange={onSearchChange} />);

    const input = screen.getByPlaceholderText('Search company or role...');
    await userEvent.type(input, 'G');

    expect(onSearchChange).toHaveBeenCalledWith('G');
  });

  it('calls onNewApplication when clicking New Application button', async () => {
    const onNewApplication = vi.fn();
    render(<ApplicationsToolbar {...defaultProps} onNewApplication={onNewApplication} />);

    await userEvent.click(screen.getByText('New Application'));

    expect(onNewApplication).toHaveBeenCalledOnce();
  });

  it('calls onManageTags when clicking Manage Tags button', async () => {
    const onManageTags = vi.fn();
    render(<ApplicationsToolbar {...defaultProps} onManageTags={onManageTags} />);

    await userEvent.click(screen.getByText('Manage Tags'));

    expect(onManageTags).toHaveBeenCalledOnce();
  });

  it('displays the current search value', () => {
    render(<ApplicationsToolbar {...defaultProps} search="Google" />);

    const input = screen.getByPlaceholderText('Search company or role...') as HTMLInputElement;
    expect(input.value).toBe('Google');
  });
});
