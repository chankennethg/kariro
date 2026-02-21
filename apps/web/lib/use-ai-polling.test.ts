import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAiPolling } from './use-ai-polling';

vi.mock('./api', () => ({
  apiClient: vi.fn(),
}));

const { apiClient } = await import('./api');
const mockApiClient = vi.mocked(apiClient);

describe('useAiPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockApiClient.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() => useAiPolling());
    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('transitions to processing when start() is called', () => {
    mockApiClient.mockResolvedValue({ success: true, data: { status: 'processing' } });
    const { result } = renderHook(() => useAiPolling());

    act(() => {
      result.current.start('job-1');
    });

    expect(result.current.status).toBe('processing');
  });

  it('calls onComplete callback and transitions to completed when job succeeds', async () => {
    const completedData = {
      id: 'ai-1',
      jobId: 'job-1',
      applicationId: 'app-1',
      type: 'analyze-job',
      status: 'completed',
      result: { fitScore: 90 },
      error: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    mockApiClient.mockResolvedValue({ success: true, data: completedData });

    const onComplete = vi.fn();
    const { result } = renderHook(() => useAiPolling());

    act(() => {
      result.current.start('job-1', { onComplete });
    });

    // Let the async poll resolve
    await act(async () => {
      await Promise.resolve();
    });

    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith(completedData);
    expect(result.current.status).toBe('completed');
  });

  it('calls onFailed callback and transitions to failed when job fails', async () => {
    const failedData = {
      id: 'ai-1',
      jobId: 'job-1',
      applicationId: 'app-1',
      type: 'analyze-job',
      status: 'failed',
      result: null,
      error: 'AI provider error',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    mockApiClient.mockResolvedValue({ success: true, data: failedData });

    const onFailed = vi.fn();
    const { result } = renderHook(() => useAiPolling());

    act(() => {
      result.current.start('job-1', { onFailed });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(onFailed).toHaveBeenCalledOnce();
    expect(onFailed).toHaveBeenCalledWith('AI provider error');
    expect(result.current.status).toBe('failed');
  });

  it('calls onFailed when the API call itself fails', async () => {
    mockApiClient.mockResolvedValue({ success: false, error: 'Network error' });

    const onFailed = vi.fn();
    const { result } = renderHook(() => useAiPolling());

    act(() => {
      result.current.start('job-1', { onFailed });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(onFailed).toHaveBeenCalledWith('Network error');
    expect(result.current.status).toBe('failed');
    expect(result.current.error).toBe('Network error');
  });

  it('schedules another poll when job is still processing', async () => {
    const processingData = {
      status: 'processing',
      id: 'ai-1',
      jobId: 'job-1',
      applicationId: 'app-1',
      type: 'analyze-job',
      result: null,
      error: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const completedData = { ...processingData, status: 'completed' };

    mockApiClient
      .mockResolvedValueOnce({ success: true, data: processingData })
      .mockResolvedValueOnce({ success: true, data: completedData });

    const onComplete = vi.fn();
    const { result } = renderHook(() => useAiPolling());

    act(() => {
      result.current.start('job-1', { onComplete });
    });

    // First poll resolves (processing)
    await act(async () => {
      await Promise.resolve();
    });
    expect(onComplete).not.toHaveBeenCalled();

    // Advance timer to trigger second poll
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('reset() returns to idle state', async () => {
    mockApiClient.mockResolvedValue({ success: true, data: { status: 'processing' } });
    const { result } = renderHook(() => useAiPolling());

    act(() => {
      result.current.start('job-1');
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
