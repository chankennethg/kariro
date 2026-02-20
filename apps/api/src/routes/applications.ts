import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import {
  ApplicationSchema,
  CreateApplicationSchema,
  UpdateApplicationSchema,
  UpdateApplicationStatusSchema,
  ListApplicationsQuerySchema,
  AttachTagsSchema,
  CoverLetterSchema,
} from '@kariro/shared';
import type { AuthUser } from '@/middleware/auth.js';
import * as applicationService from '@/services/application.service.js';
import * as tagService from '@/services/tag.service.js';
import * as coverLetterService from '@/services/cover-letter.service.js';

const app = new OpenAPIHono<{ Variables: { user: AuthUser } }>();

// ---- Application CRUD ----

const createApplicationRoute = createRoute({
  method: 'post',
  path: '/applications',
  tags: ['Applications'],
  summary: 'Create a job application',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateApplicationSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: ApplicationSchema, error: z.null() }) } },
      description: 'Application created',
    },
  },
});

app.openapi(createApplicationRoute, async (c) => {
  const userId = c.get('user').id;
  const body = c.req.valid('json');
  const application = await applicationService.createApplication(userId, body);
  return c.json(
    {
      success: true as const,
      data: { ...application, appliedAt: application.appliedAt?.toISOString() ?? null, createdAt: application.createdAt.toISOString(), updatedAt: application.updatedAt.toISOString() },
      error: null,
    },
    201,
  );
});

const listApplicationsRoute = createRoute({
  method: 'get',
  path: '/applications',
  tags: ['Applications'],
  summary: 'List job applications with filtering and cursor-based pagination',
  security: [{ Bearer: [] }],
  request: {
    query: ListApplicationsQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(ApplicationSchema),
            error: z.null(),
            meta: z.object({
              nextCursor: z.string().uuid().nullable(),
              hasMore: z.boolean(),
              limit: z.number(),
            }),
          }),
        },
      },
      description: 'List of applications',
    },
  },
});

app.openapi(listApplicationsRoute, async (c) => {
  const userId = c.get('user').id;
  const query = c.req.valid('query');
  const result = await applicationService.listApplications(userId, {
    status: query.status,
    tag: query.tag,
    search: query.search,
    cursor: query.cursor,
    limit: query.limit,
  });
  return c.json(
    {
      success: true as const,
      data: result.data.map((a) => ({ ...a, appliedAt: a.appliedAt?.toISOString() ?? null, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() })),
      error: null,
      meta: {
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
        limit: query.limit,
      },
    },
    200,
  );
});

const getApplicationRoute = createRoute({
  method: 'get',
  path: '/applications/{id}',
  tags: ['Applications'],
  summary: 'Get a single job application',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: ApplicationSchema, error: z.null() }) } },
      description: 'Application details',
    },
  },
});

app.openapi(getApplicationRoute, async (c) => {
  const userId = c.get('user').id;
  const { id } = c.req.valid('param');
  const application = await applicationService.getApplication(userId, id);
  return c.json(
    {
      success: true as const,
      data: { ...application, appliedAt: application.appliedAt?.toISOString() ?? null, createdAt: application.createdAt.toISOString(), updatedAt: application.updatedAt.toISOString() },
      error: null,
    },
    200,
  );
});

const updateApplicationRoute = createRoute({
  method: 'patch',
  path: '/applications/{id}',
  tags: ['Applications'],
  summary: 'Update a job application',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: UpdateApplicationSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: ApplicationSchema, error: z.null() }) } },
      description: 'Application updated',
    },
  },
});

app.openapi(updateApplicationRoute, async (c) => {
  const userId = c.get('user').id;
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');
  const application = await applicationService.updateApplication(userId, id, body);
  return c.json(
    {
      success: true as const,
      data: { ...application, appliedAt: application.appliedAt?.toISOString() ?? null, createdAt: application.createdAt.toISOString(), updatedAt: application.updatedAt.toISOString() },
      error: null,
    },
    200,
  );
});

const deleteApplicationRoute = createRoute({
  method: 'delete',
  path: '/applications/{id}',
  tags: ['Applications'],
  summary: 'Delete a job application',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.null(), error: z.null() }) } },
      description: 'Application deleted',
    },
  },
});

app.openapi(deleteApplicationRoute, async (c) => {
  const userId = c.get('user').id;
  const { id } = c.req.valid('param');
  await applicationService.deleteApplication(userId, id);
  return c.json({ success: true as const, data: null, error: null }, 200);
});

const updateStatusRoute = createRoute({
  method: 'patch',
  path: '/applications/{id}/status',
  tags: ['Applications'],
  summary: 'Update application status (for Kanban drag-and-drop)',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: UpdateApplicationStatusSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: ApplicationSchema, error: z.null() }) } },
      description: 'Status updated',
    },
  },
});

app.openapi(updateStatusRoute, async (c) => {
  const userId = c.get('user').id;
  const { id } = c.req.valid('param');
  const { status } = c.req.valid('json');
  const application = await applicationService.updateApplicationStatus(userId, id, status);
  return c.json(
    {
      success: true as const,
      data: { ...application, appliedAt: application.appliedAt?.toISOString() ?? null, createdAt: application.createdAt.toISOString(), updatedAt: application.updatedAt.toISOString() },
      error: null,
    },
    200,
  );
});

// ---- Application Tags ----

const attachTagsRoute = createRoute({
  method: 'post',
  path: '/applications/{id}/tags',
  tags: ['Applications', 'Tags'],
  summary: 'Attach tags to an application',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: AttachTagsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: z.object({ attached: z.number() }), error: z.null() }),
        },
      },
      description: 'Tags attached',
    },
  },
});

app.openapi(attachTagsRoute, async (c) => {
  const userId = c.get('user').id;
  const { id } = c.req.valid('param');
  const { tagIds } = c.req.valid('json');
  const result = await tagService.attachTags(userId, id, tagIds);
  return c.json({ success: true as const, data: result, error: null }, 200);
});

const removeTagRoute = createRoute({
  method: 'delete',
  path: '/applications/{id}/tags/{tagId}',
  tags: ['Applications', 'Tags'],
  summary: 'Remove a tag from an application',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid(), tagId: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.null(), error: z.null() }) } },
      description: 'Tag removed',
    },
  },
});

app.openapi(removeTagRoute, async (c) => {
  const userId = c.get('user').id;
  const { id, tagId } = c.req.valid('param');
  await tagService.removeTag(userId, id, tagId);
  return c.json({ success: true as const, data: null, error: null }, 200);
});

// ---- Cover Letters ----

const listCoverLettersRoute = createRoute({
  method: 'get',
  path: '/applications/{id}/cover-letters',
  tags: ['Applications', 'AI'],
  summary: 'List cover letters for a job application',
  description: `Returns all AI-generated cover letters for the specified application, ordered newest first.

Ownership is verified — users can only access their own applications' cover letters.`,
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(CoverLetterSchema),
            error: z.null(),
          }),
        },
      },
      description: 'List of cover letters',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(false),
            data: z.null(),
            error: z.string(),
            errorCode: z.string(),
          }),
        },
      },
      description: 'Application not found',
    },
  },
});

app.openapi(listCoverLettersRoute, async (c) => {
  const userId = c.get('user').id;
  const { id } = c.req.valid('param');
  const letters = await coverLetterService.getCoverLettersByApplicationId(userId, id);
  return c.json(
    {
      success: true as const,
      data: letters.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
      error: null,
    },
    200,
  );
});

export default app;
