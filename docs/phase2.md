## Phase 2: Database Schema & Core CRUD

### Prompt for Claude Code

> Read the CLAUDE.md for project context. Now add the core database schema and CRUD endpoints for job applications.
>
> **Database tables (Drizzle schema in `apps/api/src/db/schema/`):**
>
> `users` table:
> - id (uuid, PK, default gen_random_uuid)
> - email (varchar, unique, not null)
> - name (varchar, not null)
> - password_hash (varchar, not null)
> - created_at, updated_at (timestamps)
>
> `job_applications` table:
> - id (uuid, PK)
> - user_id (uuid, FK → users, not null)
> - company_name (varchar, not null)
> - role_title (varchar, not null)
> - job_url (varchar, nullable)
> - job_description (text, nullable)
> - status (enum: 'saved', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn', default 'saved')
> - salary_min (integer, nullable)
> - salary_max (integer, nullable)
> - salary_currency (varchar, default 'USD')
> - location (varchar, nullable)
> - work_mode (enum: 'remote', 'hybrid', 'onsite', nullable)
> - notes (text, nullable)
> - applied_at (timestamp, nullable)
> - created_at, updated_at (timestamps)
>
> `tags` table:
> - id (uuid, PK)
> - user_id (uuid, FK → users)
> - name (varchar, not null)
> - color (varchar, nullable, e.g. '#3B82F6')
> - unique constraint on (user_id, name)
>
> `job_application_tags` (junction table):
> - job_application_id (uuid, FK)
> - tag_id (uuid, FK)
> - PK on (job_application_id, tag_id)
>
> **Shared Zod schemas (`packages/shared`):**
> - Create request/response Zod schemas for all CRUD operations
> - Export TypeScript types inferred from Zod schemas
> - These schemas will be used by both the API (validation + OpenAPI) and frontend (type safety)
>
> **API endpoints (all under `/api/v1`, all with OpenAPI metadata):**
>
> Job Applications:
> - `POST /api/v1/applications` — create (validate with Zod)
> - `GET /api/v1/applications` — list with filtering (status, tag, search) and cursor-based pagination
> - `GET /api/v1/applications/:id` — get single
> - `PATCH /api/v1/applications/:id` — update (partial)
> - `DELETE /api/v1/applications/:id` — soft delete or hard delete
> - `PATCH /api/v1/applications/:id/status` — update status only (for Kanban drag-and-drop)
>
> Tags:
> - `POST /api/v1/tags` — create
> - `GET /api/v1/tags` — list all for user
> - `DELETE /api/v1/tags/:id` — delete
> - `POST /api/v1/applications/:id/tags` — attach tags to application
> - `DELETE /api/v1/applications/:id/tags/:tagId` — remove tag from application
>
> **Architecture:**
> - Follow layered pattern: route (OpenAPI definition + handler) → service (business logic) → Drizzle queries
> - Services are pure functions that accept data and return data — no Hono types
> - Use `drizzle-zod` to bridge Drizzle schemas to Zod where it makes sense
>
> **Tests:**
> - Write service-level tests for create, get, list (with filters), update, and delete
> - Write at least one route-level test using Hono's `app.request()` test helper
>
> Generate the migrations and verify they apply against the local Docker Postgres.

### Definition of Done
- [ ] All tables created and migrations applied successfully
- [ ] All CRUD endpoints visible and testable in Scalar docs at `/docs`
- [ ] Cursor-based pagination works on the list endpoint
- [ ] Tag filtering works (filter applications by tag)
- [ ] Status update endpoint works (for future Kanban board)
- [ ] `packages/shared` exports all Zod schemas and inferred types
- [ ] All tests pass