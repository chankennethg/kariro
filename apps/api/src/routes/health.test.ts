import { describe, it, expect } from 'vitest';
import app from '../app.js';

describe('Health Check', () => {
  it('GET /api/v1/health returns 200 with status ok', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { status: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });
});
