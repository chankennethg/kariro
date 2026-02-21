import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Profile } from '@kariro/shared';

vi.mock('@/lib/api', () => ({
  apiClient: vi.fn(),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: vi.fn(() => ({ isLoading: false })),
}));

// sonner toast - suppress in tests
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const { apiClient } = await import('@/lib/api');
const mockApiClient = vi.mocked(apiClient);

const { toast } = await import('sonner');
const mockToast = vi.mocked(toast);

const mockProfile: Profile = {
  id: 'profile-1',
  userId: 'user-1',
  resumeText: 'Experienced software engineer…',
  skills: ['TypeScript', 'React'],
  preferredRoles: ['Frontend Engineer'],
  preferredLocations: ['Remote'],
  salaryExpectationMin: 100000,
  salaryExpectationMax: 150000,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ProfilePage', () => {
  beforeEach(() => {
    mockApiClient.mockReset();
    vi.mocked(mockToast.success).mockReset();
    vi.mocked(mockToast.error).mockReset();
  });

  it('shows loading skeleton while profile is loading', async () => {
    // Delay the resolution so we can observe loading state
    let resolve!: (v: unknown) => void;
    mockApiClient.mockReturnValueOnce(new Promise((r) => { resolve = r; }));

    const { ProfilePage } = await import('./profile-page');
    const { container } = render(<ProfilePage />);

    // The loading skeleton is an animate-pulse div
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();

    // Clean up
    resolve({ success: true, data: null });
  });

  it('renders the form with profile data after loading', async () => {
    mockApiClient.mockResolvedValueOnce({ success: true, data: mockProfile });

    const { ProfilePage } = await import('./profile-page');
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('Experienced software engineer…')).toBeInTheDocument();
  });

  it('shows empty form when no profile exists yet', async () => {
    mockApiClient.mockResolvedValueOnce({ success: true, data: null });

    const { ProfilePage } = await import('./profile-page');
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Paste your resume text here…');
    expect(textarea).toHaveValue('');
  });

  it('shows success toast on successful save', async () => {
    mockApiClient
      .mockResolvedValueOnce({ success: true, data: mockProfile })
      .mockResolvedValueOnce({ success: true, data: mockProfile });

    const { ProfilePage } = await import('./profile-page');
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Save Profile')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Save Profile'));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Profile saved');
    });
  });

  it('shows error toast when save fails', async () => {
    mockApiClient
      .mockResolvedValueOnce({ success: true, data: null })
      .mockResolvedValueOnce({ success: false, error: 'Failed to save profile' });

    const { ProfilePage } = await import('./profile-page');
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Save Profile')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Save Profile'));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to save profile');
    });
  });
});
