'use client';

import { useState, useCallback, useRef } from 'react';
import type { AiAnalysis } from '@kariro/shared';
import { apiClient } from './api';

type PollingState = {
  status: 'idle' | 'processing' | 'completed' | 'failed';
  result: AiAnalysis | null;
  error: string | null;
};

type PollingCallbacks = {
  onComplete?: (result: AiAnalysis) => void;
  onFailed?: (error: string | null) => void;
};

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 150; // ~5 minutes at 2s intervals

export function useAiPolling() {
  const [state, setState] = useState<PollingState>({
    status: 'idle',
    result: null,
    error: null,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const cancelledRef = useRef(false);
  const callbacksRef = useRef<PollingCallbacks>({});

  const reset = useCallback(() => {
    cancelledRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState({ status: 'idle', result: null, error: null });
  }, []);

  const start = useCallback((id: string, callbacks?: PollingCallbacks) => {
    // Cancel any in-flight poll before starting a new one
    cancelledRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    callbacksRef.current = callbacks ?? {};
    attemptsRef.current = 0;
    cancelledRef.current = false;
    setState({ status: 'processing', result: null, error: null });

    async function poll() {
      if (cancelledRef.current) return;

      if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
        const error = 'Analysis timed out. Please try again.';
        setState({ status: 'failed', result: null, error });
        callbacksRef.current.onFailed?.(error);
        return;
      }
      attemptsRef.current += 1;

      const res = await apiClient<AiAnalysis>(`/ai/jobs/${id}`);

      if (cancelledRef.current) return;

      if (!res.success) {
        const error = res.error ?? 'Unknown error';
        setState({ status: 'failed', result: null, error });
        callbacksRef.current.onFailed?.(error);
        return;
      }

      if (!res.data) {
        const error = 'Empty response from server';
        setState({ status: 'failed', result: null, error });
        callbacksRef.current.onFailed?.(error);
        return;
      }

      const analysis = res.data;

      if (analysis.status === 'completed') {
        setState({ status: 'completed', result: analysis, error: null });
        callbacksRef.current.onComplete?.(analysis);
      } else if (analysis.status === 'failed') {
        const error = analysis.error ?? 'Analysis failed';
        setState({ status: 'failed', result: null, error });
        callbacksRef.current.onFailed?.(error);
      } else {
        timeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    void poll();
  }, []);

  return { ...state, start, reset };
}
