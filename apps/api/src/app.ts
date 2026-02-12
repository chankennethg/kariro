import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { errorHandler } from './middleware/error.js';
import healthRoutes from './routes/health.js';

const app = new OpenAPIHono();

app.onError(errorHandler);

// Mount routes
const api = app.basePath('/api/v1');
api.route('/', healthRoutes);

// OpenAPI JSON doc
api.doc('/doc', {
  openapi: '3.0.0',
  info: {
    title: 'Kariro API',
    version: '0.0.1',
    description: 'AI-powered job application tracker API',
  },
});

// Scalar API reference UI
api.get(
  '/reference',
  apiReference({
    url: '/api/v1/doc',
    theme: 'kepler',
  }),
);

export default app;
