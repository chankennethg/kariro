## Phase 3: Authentication

### Prompt for Claude Code

> Read the CLAUDE.md for project context. Add JWT authentication to the Kariro API.
>
> **Auth system:**
> - `POST /api/v1/auth/register` — create user (email, name, password). Hash password with bcrypt. Return access token + refresh token.
> - `POST /api/v1/auth/login` — email + password login. Return access token + refresh token.
> - `POST /api/v1/auth/refresh` — exchange refresh token for new access token.
> - `POST /api/v1/auth/logout` — invalidate refresh token.
> - `GET /api/v1/auth/me` — get current user profile (protected).
>
> **Token strategy:**
> - Access token: JWT, short-lived (15 minutes), contains user id and email
> - Refresh token: opaque token stored in database, long-lived (7 days)
> - Add a `refresh_tokens` table: id, user_id (FK), token (hashed), expires_at, created_at
>
> **Middleware:**
> - Create an `authMiddleware` that verifies the JWT from the `Authorization: Bearer <token>` header
> - If invalid or expired, return 401
> - Set the authenticated user on the Hono context (`c.set('user', ...)`)
>
> **Protect existing routes:**
> - All `/api/v1/applications/*` and `/api/v1/tags/*` routes must require authentication
> - All queries must be scoped to the authenticated user's ID (users can only see their own data)
> - The health check and auth routes remain public
>
> **OpenAPI:**
> - Add bearer auth security scheme to the OpenAPI spec
> - All protected routes should show the lock icon in Scalar docs
>
> **Tests:**
> - Test register, login, token refresh, and accessing protected routes with/without valid tokens
> - Test that users cannot access other users' applications

### Definition of Done
- [ ] Register and login work, returning JWT tokens
- [ ] Token refresh works correctly
- [ ] All application/tag routes require valid JWT
- [ ] Users can only access their own data
- [ ] Scalar docs show auth requirements (lock icon) on protected routes
- [ ] Expired tokens return 401
- [ ] All tests pass