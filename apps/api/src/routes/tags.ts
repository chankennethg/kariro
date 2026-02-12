import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { TagSchema, CreateTagSchema } from '@kariro/shared';
import * as tagService from '@/services/tag.service.js';

const app = new OpenAPIHono();

function getUserId(c: { req: { header: (name: string) => string | undefined } }): string {
  const userId = c.req.header('x-user-id');
  if (!userId) {
    throw new Error('x-user-id header is required');
  }
  return userId;
}

const createTagRoute = createRoute({
  method: 'post',
  path: '/tags',
  tags: ['Tags'],
  summary: 'Create a tag',
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
  const userId = getUserId(c);
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
  const userId = getUserId(c);
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
  const userId = getUserId(c);
  const { id } = c.req.valid('param');
  await tagService.deleteTag(userId, id);
  return c.json({ success: true as const, data: null, error: null }, 200);
});

export default app;
