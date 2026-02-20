import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { ProfileSchema, UpsertProfileSchema } from '@kariro/shared';
import type { AuthUser } from '@/middleware/auth.js';
import { AppError } from '@/middleware/error.js';
import * as profileService from '@/services/profile.service.js';

const app = new OpenAPIHono<{ Variables: { user: AuthUser } }>();

// ---- Upsert Profile ----

const upsertProfileRoute = createRoute({
  method: 'put',
  path: '/profile',
  tags: ['Profile'],
  summary: 'Create or update user profile',
  description: `Create or update the authenticated user's profile. Uses upsert semantics — creates a new profile on first call, updates on subsequent calls. All fields are optional; only provided fields are updated.

The profile is used by AI analysis endpoints to personalize fit scores and skill gap assessments. Providing a resume and skills list improves analysis quality.

\`salaryExpectationMin\` must be less than or equal to \`salaryExpectationMax\` when both are provided.`,
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpsertProfileSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: ProfileSchema,
            error: z.null(),
          }),
        },
      },
      description: 'Profile created or updated',
    },
  },
});

app.openapi(upsertProfileRoute, async (c) => {
  const userId = c.get('user').id;
  const body = c.req.valid('json');

  // Validate the effective min/max by merging the incoming values with any
  // stored values — a partial update could violate the constraint even when
  // only one of the two fields is present in the request body.
  const existing = await profileService.getProfile(userId);
  const effectiveMin = body.salaryExpectationMin ?? existing?.salaryExpectationMin ?? null;
  const effectiveMax = body.salaryExpectationMax ?? existing?.salaryExpectationMax ?? null;

  if (effectiveMin != null && effectiveMax != null && effectiveMin > effectiveMax) {
    throw new AppError(
      400,
      'INVALID_INPUT',
      'Minimum salary must be less than or equal to maximum salary',
    );
  }

  const profile = await profileService.upsertProfile(userId, body);
  return c.json(
    {
      success: true as const,
      data: {
        ...profile,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
      error: null,
    },
    200,
  );
});

// ---- Get Profile ----

const getProfileRoute = createRoute({
  method: 'get',
  path: '/profile',
  tags: ['Profile'],
  summary: 'Get current user profile',
  description: 'Returns the authenticated user\'s profile, or `null` in the `data` field if no profile has been created yet. A null response is not an error — it means the user has not set up their profile.',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: ProfileSchema.nullable(),
            error: z.null(),
          }),
        },
      },
      description: 'User profile (null if not set up yet)',
    },
  },
});

app.openapi(getProfileRoute, async (c) => {
  const userId = c.get('user').id;
  const profile = await profileService.getProfile(userId);
  return c.json(
    {
      success: true as const,
      data: profile
        ? {
            ...profile,
            createdAt: profile.createdAt.toISOString(),
            updatedAt: profile.updatedAt.toISOString(),
          }
        : null,
      error: null,
    },
    200,
  );
});

export default app;
