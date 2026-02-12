import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import {
  ApplicationSchema,
  CreateApplicationSchema,
  UpdateApplicationSchema,
  UpdateApplicationStatusSchema,
  ListApplicationsQuerySchema,
  AttachTagsSchema,
} from '@kariro/shared';
import * as applicationService from '@/services/application.service.js';
import * as tagService from '@/services/tag.service.js';

const app = new OpenAPIHono();

// For now, use a hardcoded user ID header until auth is implemented
function getUserId(c: { req: { header: (name: string) => string | undefined } }): string {
  const userId = c.req.header('x-user-id');
  if (!userId) {
    throw new Error('x-user-id header is required');
  }
  return userId;
}

// ---- Application CRUD ----

const createApplicationRoute = createRoute({
  method: 'post',
  path: '/applications',
  tags: ['Applications'],
  summary: 'Create a job application',
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
  const userId = getUserId(c);
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
  const userId = getUserId(c);
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
  const userId = getUserId(c);
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
  const userId = getUserId(c);
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
  const userId = getUserId(c);
  const { id } = c.req.valid('param');
  await applicationService.deleteApplication(userId, id);
  return c.json({ success: true as const, data: null, error: null }, 200);
});

const updateStatusRoute = createRoute({
  method: 'patch',
  path: '/applications/{id}/status',
  tags: ['Applications'],
  summary: 'Update application status (for Kanban drag-and-drop)',
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
  const userId = getUserId(c);
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
  const userId = getUserId(c);
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
  const userId = getUserId(c);
  const { id, tagId } = c.req.valid('param');
  await tagService.removeTag(userId, id, tagId);
  return c.json({ success: true as const, data: null, error: null }, 200);
});

export default app;
