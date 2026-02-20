import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { secureHeaders } from 'hono/secure-headers';
import { cors } from 'hono/cors';
import { errorHandler } from './middleware/error.js';
import { requireAuth } from './middleware/auth.js';
import { rateLimiter } from './middleware/rate-limit.js';
import { logger } from './lib/logger.js';
import { apiDescription } from './lib/openapi.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import applicationRoutes from './routes/applications.js';
import tagRoutes from './routes/tags.js';
import profileRoutes from './routes/profile.js';
import aiRoutes from './routes/ai.js';

const app = new OpenAPIHono();

// Security headers (HSTS, X-Content-Type-Options, X-Frame-Options, etc.)
app.use(secureHeaders());

// CORS — restrict to known origins
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.use(logger());
app.onError(errorHandler);

// Mount API routes
const api = app.basePath('/api/v1');

// Register Bearer security scheme for OpenAPI docs
api.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

// Global rate limit (all API endpoints)
api.use('/*', rateLimiter({ windowMs: 60 * 1000, max: 100 }));

// Stricter rate limit on auth endpoints
api.use('/auth/*', rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 }));

// Public routes
api.route('/', healthRoutes);
api.route('/', authRoutes);

// Protected routes — require JWT
api.use('/applications/*', requireAuth);
api.use('/tags/*', requireAuth);
api.use('/profile', requireAuth);
api.use('/profile/*', requireAuth);
api.use('/ai/*', rateLimiter({ windowMs: 60 * 1000, max: 5 }));
api.use('/ai/*', requireAuth);
api.route('/', applicationRoutes);
api.route('/', tagRoutes);
api.route('/', profileRoutes);
api.route('/', aiRoutes);

// OpenAPI JSON spec — must be on the `api` instance where routes are registered
api.doc('/doc', {
  openapi: '3.0.0',
  info: {
    title: 'Kariro API',
    version: '0.0.1',
    description: apiDescription,
  },
});

// Top-level redirect so /openapi still works
app.get('/openapi', (c) => c.redirect('/api/v1/doc'));

// Scalar API reference UI
app.get(
  '/docs',
  apiReference({
    url: '/api/v1/doc',
    theme: 'kepler',
  }),
);

export default app;
