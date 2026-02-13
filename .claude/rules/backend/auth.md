# Authentication (Backend)

## JWT (hono/jwt)

- Access tokens: 15-minute expiry, HS256 algorithm.
- Always pass algorithm explicitly: `sign(payload, secret, 'HS256')` and `verify(token, secret, 'HS256')`. Omitting `alg` in `verify()` causes a runtime error.
- Token payload contains `sub` (user ID), `email`, and `exp` claims.

## Refresh Tokens

- Random hex string (`crypto.randomBytes(32)`), hashed with `crypto.createHash('sha256')` before storing in the `refresh_tokens` table.
- Never store raw refresh tokens in the database.

## Auth Middleware

- `requireAuth` in `middleware/auth.ts` — verifies JWT and sets `c.get('user')` as `{ id, email }`.
- Apply with wildcard pattern: `api.use('/applications/*', requireAuth)`. Without `/*`, nested routes won't be protected.

## Route Ordering (app.ts)

1. Mount public routes (health, auth).
2. Register `api.use('/path/*', requireAuth)` for each protected prefix.
3. Mount protected routes.

## OpenAPI Security

- Security scheme registered globally: `api.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', ...)`.
- Every protected `createRoute()` must include `security: [{ Bearer: [] }]`.
