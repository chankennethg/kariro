import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { TagSchema, CreateTagSchema } from '@kariro/shared';
import type { AuthUser } from '@/middleware/auth.js';
import * as tagService from '@/services/tag.service.js';

const app = new OpenAPIHono<{ Variables: { user: AuthUser } }>();

const createTagRoute = createRoute({
  method: 'post',
  path: '/tags',
  tags: ['Tags'],
  summary: 'Create a tag',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateTagSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: TagSchema, error: z.null() }),
        },
      },
      description: 'Tag created',
    },
  },
});

app.openapi(createTagRoute, async (c) => {
  const userId = c.get('user').id;
  const body = c.req.valid('json');
  const tag = await tagService.createTag(userId, body);
  return c.json(
    {
      success: true as const,
      data: { ...tag, createdAt: tag.createdAt.toISOString(), updatedAt: tag.updatedAt.toISOString() },
      error: null,
    },
    201,
  );
});

const listTagsRoute = createRoute({
  method: 'get',
  path: '/tags',
  tags: ['Tags'],
  summary: 'List all tags for the current user',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: z.array(TagSchema), error: z.null() }),
        },
      },
      description: 'List of tags',
    },
  },
});

app.openapi(listTagsRoute, async (c) => {
  const userId = c.get('user').id;
  const tagList = await tagService.listTags(userId);
  return c.json(
    {
      success: true as const,
      data: tagList.map((t) => ({ ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() })),
      error: null,
    },
    200,
  );
});

const deleteTagRoute = createRoute({
  method: 'delete',
  path: '/tags/{id}',
  tags: ['Tags'],
  summary: 'Delete a tag',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: z.null(), error: z.null() }),
        },
      },
      description: 'Tag deleted',
    },
  },
});

app.openapi(deleteTagRoute, async (c) => {
  const userId = c.get('user').id;
  const { id } = c.req.valid('param');
  await tagService.deleteTag(userId, id);
  return c.json({ success: true as const, data: null, error: null }, 200);
});

export default app;
