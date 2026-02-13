import { createMiddleware } from 'hono/factory';
import { getConnInfo } from '@hono/node-server/conninfo';
import { AppError } from './error.js';

interface RateLimitEntry {
  readonly count: number;
  readonly resetAt: number;
}

interface RateLimitOptions {
  readonly windowMs: number;
  readonly max: number;
}

const MAX_STORE_SIZE = 10_000;

/**
 * In-memory sliding window rate limiter.
 * For multi-instance deployments, swap to a Redis-backed implementation.
 */
export function rateLimiter({ windowMs, max }: RateLimitOptions) {
  const store = new Map<string, RateLimitEntry>();

  // Periodically clean expired entries to prevent memory leaks
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, windowMs);

  // Allow GC to collect the timer if the module is unloaded
  if (cleanup.unref) {
    cleanup.unref();
  }

  return createMiddleware(async (c, next) => {
    // Use actual connection IP via Hono conninfo (not spoofable headers)
    let key: string;
    try {
      const info = getConnInfo(c);
      key = info.remote.address ?? 'unknown';
    } catch {
      // Fallback: all unidentifiable clients share one bucket (never trust spoofable headers)
      key = 'unknown';
    }

    const now = Date.now();

    const existing = store.get(key);
    if (!existing || existing.resetAt <= now) {
      // Cap store size to prevent memory exhaustion from many unique IPs
      if (store.size >= MAX_STORE_SIZE) {
        // Evict expired entries first
        for (const [k, entry] of store) {
          if (entry.resetAt <= now) store.delete(k);
        }
        // If still at capacity, evict the oldest entry
        if (store.size >= MAX_STORE_SIZE) {
          const firstKey = store.keys().next().value;
          if (firstKey) store.delete(firstKey);
        }
      }
      store.set(key, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    if (existing.count >= max) {
      const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      throw new AppError(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests, please try again later');
    }

    store.set(key, { ...existing, count: existing.count + 1 });
    await next();
  });
}
