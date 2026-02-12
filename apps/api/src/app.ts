import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { errorHandler } from './middleware/error.js';
import { logger } from './lib/logger.js';
import healthRoutes from './routes/health.js';
import applicationRoutes from './routes/applications.js';
import tagRoutes from './routes/tags.js';

const app = new OpenAPIHono();

app.use(logger());
app.onError(errorHandler);

// Mount API routes
const api = app.basePath('/api/v1');
api.route('/', healthRoutes);
api.route('/', applicationRoutes);
api.route('/', tagRoutes);

// OpenAPI JSON spec — must be on the `api` instance where routes are registered
api.doc('/doc', {
  openapi: '3.0.0',
  info: {
    title: 'Kariro API',
    version: '0.0.1',
    description: 'AI-powered job application tracker API',
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
