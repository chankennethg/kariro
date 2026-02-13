import { createMiddleware } from 'hono/factory';
import { verifyAccessToken } from '@/services/auth.service.js';
import { AppError } from './error.js';

export type AuthUser = { id: string; email: string };

export const requireAuth = createMiddleware<{ Variables: { user: AuthUser } }>(async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'MISSING_TOKEN', 'Authorization header required');
  }

  const payload = await verifyAccessToken(header.slice(7));
  c.set('user', { id: payload.sub, email: payload.email });
  await next();
});
