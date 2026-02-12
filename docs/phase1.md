## Phase 1: Project Scaffolding & Infrastructure

### Prompt for Claude Code

> Set up the Kariro monorepo from scratch. This is an AI-powered job application tracker.
>
> **Monorepo setup:**
> - Initialize a Turborepo monorepo with pnpm workspaces
> - Create two apps: `apps/api` (Hono backend) and `apps/web` (Next.js 16 frontend)
> - Create one shared package: `packages/shared` (shared Zod schemas and TypeScript types)
> - Configure TypeScript with strict mode across all packages
> - Set up ESLint + Prettier with shared config
> - Add a root `turbo.json` with `dev`, `build`, `lint`, and `test` pipelines
>
> **API app (`apps/api`):**
> - Hono with TypeScript, running on port 4000
> - `@hono/zod-openapi` for typed OpenAPI routes
> - Scalar API docs served at `/docs` and OpenAPI spec at `/openapi`
> - Drizzle ORM with `drizzle-kit` for migrations
> - Vitest for testing
> - Pino for structured logging via `hono-pino`
> - A health check route at `GET /api/v1/health` that returns `{ status: "ok" }` — this should appear in Scalar docs
> - Global error handling middleware with a custom `AppError` class
> - Env validation with Zod in `src/lib/env.ts`
>
> **Frontend app (`apps/web`):**
> - Next.js 16 with App Router, TypeScript
> - Tailwind CSS configured
> - shadcn/ui initialized
> - A simple landing page at `/` that says "Kariro — AI-powered job application tracker"
>
> **Docker:**
> - `docker-compose.yml` at the root with PostgreSQL 16 and Redis 7 services
> - Postgres exposed on port 5432, Redis on port 6379
> - Use environment variables for connection strings
>
> **Root-level files:**
> - `Makefile` with shortcuts: `make dev`, `make build`, `make test`, `make db-generate`, `make db-migrate`, `make db-studio`, `make docker-up`, `make docker-down`
> - `.env.example` with all required environment variables documented
>
> After setup, verify: `docker compose up -d`, then `pnpm dev` should start both apps. The API health check should respond at `http://localhost:4000/api/v1/health` and Scalar docs should render at `http://localhost:4000/docs`. Next.js should render at `http://localhost:3000`.

### Definition of Done
- [ ] `pnpm dev` starts both API and frontend without errors
- [ ] `http://localhost:4000/docs` shows Scalar UI with the health check endpoint
- [ ] `http://localhost:4000/api/v1/health` returns `{ status: "ok" }`
- [ ] `http://localhost:3000` renders the landing page
- [ ] `pnpm test -- --run` passes (at least the health check test)
- [ ] `pnpm lint` passes with no errors
- [ ] Docker Compose starts Postgres and Redis successfully
