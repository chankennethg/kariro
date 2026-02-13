import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
  AuthTokensSchema,
  UserProfileSchema,
} from '@kariro/shared';
import * as authService from '@/services/auth.service.js';
import { requireAuth } from '@/middleware/auth.js';
import type { AuthUser } from '@/middleware/auth.js';

const app = new OpenAPIHono<{ Variables: { user: AuthUser } }>();

const ErrorResponseSchema = z.object({
  success: z.literal(false),
  data: z.null(),
  error: z.string(),
  errorCode: z.string(),
});

// ---- POST /auth/register ----

const registerRoute = createRoute({
  method: 'post',
  path: '/auth/register',
  tags: ['Auth'],
  summary: 'Register a new user',
  request: {
    body: {
      content: {
        'application/json': { schema: RegisterSchema },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ user: UserProfileSchema, tokens: AuthTokensSchema }),
            error: z.null(),
          }),
        },
      },
      description: 'User registered',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Validation error',
    },
    409: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Email already exists',
    },
  },
});

app.openapi(registerRoute, async (c) => {
  const { email, password, name } = c.req.valid('json');
  const result = await authService.registerUser(email, password, name);
  return c.json({ success: true as const, data: result, error: null }, 201);
});

// ---- POST /auth/login ----

const loginRoute = createRoute({
  method: 'post',
  path: '/auth/login',
  tags: ['Auth'],
  summary: 'Login with email and password',
  request: {
    body: {
      content: {
        'application/json': { schema: LoginSchema },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ user: UserProfileSchema, tokens: AuthTokensSchema }),
            error: z.null(),
          }),
        },
      },
      description: 'Login successful',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Validation error',
    },
    401: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid credentials',
    },
  },
});

app.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid('json');
  const result = await authService.loginUser(email, password);
  return c.json({ success: true as const, data: result, error: null }, 200);
});

// ---- POST /auth/refresh ----

const refreshRoute = createRoute({
  method: 'post',
  path: '/auth/refresh',
  tags: ['Auth'],
  summary: 'Refresh access token',
  request: {
    body: {
      content: {
        'application/json': { schema: RefreshSchema },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: AuthTokensSchema,
            error: z.null(),
          }),
        },
      },
      description: 'Token refreshed',
    },
    401: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid or expired refresh token',
    },
  },
});

app.openapi(refreshRoute, async (c) => {
  const { refreshToken } = c.req.valid('json');
  const tokens = await authService.refreshAccessToken(refreshToken);
  return c.json({ success: true as const, data: tokens, error: null }, 200);
});

// ---- POST /auth/logout ----

app.use('/auth/logout', requireAuth);

const logoutRoute = createRoute({
  method: 'post',
  path: '/auth/logout',
  tags: ['Auth'],
  summary: 'Logout (invalidate refresh token)',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': { schema: RefreshSchema },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.null(),
            error: z.null(),
          }),
        },
      },
      description: 'Logged out',
    },
    401: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Authentication required',
    },
  },
});

app.openapi(logoutRoute, async (c) => {
  const { refreshToken } = c.req.valid('json');
  const { id } = c.get('user');
  await authService.logoutUser(id, refreshToken);
  return c.json({ success: true as const, data: null, error: null }, 200);
});

// ---- GET /auth/me ----

app.use('/auth/me', requireAuth);

const meRoute = createRoute({
  method: 'get',
  path: '/auth/me',
  tags: ['Auth'],
  summary: 'Get current user profile',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: UserProfileSchema,
            error: z.null(),
          }),
        },
      },
      description: 'Current user profile',
    },
    401: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Authentication required',
    },
  },
});

app.openapi(meRoute, async (c) => {
  const { id } = c.get('user');
  const user = await authService.getCurrentUser(id);
  return c.json({ success: true as const, data: user, error: null }, 200);
});

export default app;
