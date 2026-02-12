# Kariro

AI-powered job application tracker. Built to learn TypeScript backend development.

## Overview

Kariro helps job seekers manage their entire job hunt from one place. Users add job applications and track them through a Kanban-style pipeline (Saved → Applied → Screening → Interview → Offer → Rejected). What sets it apart is the AI layer: paste a job posting URL or description and Kariro analyzes it — extracting structured data (company, role, required skills, salary range), scoring how well it fits the user's profile, generating tailored cover letters, and producing interview prep questions based on the role. Applications flow through a dashboard with filtering, tagging, follow-up reminders, and analytics (response rates, time-in-stage, activity trends). The API is fully documented via OpenAPI/Scalar so it can also be used programmatically or integrated into other tools.

## Tech Stack

- **Runtime**: Node.js (v20+)
- **Framework**: Hono (API), Next.js 16 (Frontend — App Router)
- **Validation**: Zod + @hono/zod-openapi
- **ORM**: Drizzle ORM (PostgreSQL)
- **Database**: PostgreSQL 16 (Supabase in prod, Docker locally)
- **Cache/Queue**: Redis + BullMQ (Upstash Redis in prod, Docker locally)
- **AI**: Vercel AI SDK (`ai` package) with OpenAI and Anthropic providers
- **API Docs**: Scalar (@scalar/hono-api-reference)
- **Testing**: Vitest (API), Vitest + React Testing Library (Frontend)
- **Frontend**: Next.js 16 (App Router, Server Components, `apps/web`)
- **Styling**: Tailwind CSS + shadcn/ui
- **Monorepo**: Turborepo
- **Package Manager**: pnpm

## Commands

```bash
pnpm install                  # install all deps
pnpm dev                      # run all apps in dev mode
pnpm dev --filter api         # run only the API
pnpm dev --filter web         # run only the frontend (Next.js on :3000)
pnpm build                    # build all apps
pnpm test                     # run all tests
pnpm test -- --run            # run tests once (no watch)
pnpm lint                     # eslint + prettier check
pnpm lint:fix                 # auto-fix lint issues
pnpm db:generate              # generate Drizzle migrations
pnpm db:migrate               # apply migrations
pnpm db:studio                # open Drizzle Studio
docker compose up -d           # start Postgres + Redis locally
docker compose down            # stop local services
```

## Project Structure

```
kariro/
├── apps/
│   ├── api/                  # Hono API (main backend, runs on :4000)
│   │   ├── src/
│   │   │   ├── routes/       # Route definitions with OpenAPI metadata
│   │   │   ├── services/     # Business logic (pure functions, no HTTP concepts)
│   │   │   ├── db/
│   │   │   │   ├── schema/   # Drizzle table definitions (single source of truth for types)
│   │   │   │   └── migrations/
│   │   │   ├── middleware/   # Auth, error handling, rate limiting
│   │   │   ├── lib/          # Shared utilities, AI helpers, queue setup
│   │   │   └── app.ts        # Hono app setup, middleware registration, route mounting
│   │   └── vitest.config.ts
│   └── web/                  # Next.js 16 frontend (App Router, runs on :3000)
│       ├── app/              # App Router pages and layouts
│       │   ├── layout.tsx    # Root layout
│       │   ├── page.tsx      # Landing page
│       │   ├── (auth)/       # Auth route group (login, register)
│       │   └── (dashboard)/  # Protected dashboard route group
│       ├── components/       # React components (prefer Server Components by default)
│       │   └── ui/           # shadcn/ui components
│       ├── lib/              # Client-side utilities, API client, hooks
│       └── next.config.ts
├── packages/
│   └── shared/               # Shared Zod schemas and TypeScript types
├── docker-compose.yml
├── turbo.json
└── CLAUDE.md
```

## Architecture Rules

- **Layered flow**: routes → services → Drizzle queries. Routes handle HTTP, services handle logic. Services NEVER import Hono types.
- **Zod schemas are the source of truth**. Every request body, response, and query param has a Zod schema. Drizzle schemas define DB shape; Zod schemas define API shape. Use `drizzle-zod` to bridge when they overlap.
- **Every route MUST have OpenAPI metadata** via `@hono/zod-openapi` createRoute pattern. No undocumented endpoints.
- **Environment variables**: Validated at startup with Zod in `apps/api/src/lib/env.ts`. Never use `process.env` directly elsewhere; import from `env.ts`.
- **Error handling**: Use a custom `AppError` class with status code and error code. Global error middleware in `middleware/error.ts` catches and formats all errors consistently.
- **AI calls go through the queue**. Never call AI providers directly in route handlers. Enqueue a BullMQ job and return 202 with a job ID. The worker processes it async.

## Next.js Frontend Rules

- **App Router only**. Do NOT use the `pages/` directory.
- **Server Components by default**. Only add `"use client"` when the component needs interactivity (state, effects, event handlers, browser APIs).
- **Data fetching**: Use Server Components with `fetch()` to call the Hono API. For client-side mutations and real-time data, use React hooks in Client Components.
- **API calls from Server Components**: Call the Hono API directly via `fetch("http://localhost:4000/api/v1/...")` with appropriate headers. Do NOT use Next.js API routes as a proxy — the Hono API is the single source of truth.
- **Do NOT duplicate backend logic in Next.js API routes**. The Hono API handles all business logic, auth, and validation. Next.js is purely a presentation layer.
- **Route groups**: Use `(auth)` for login/register pages and `(dashboard)` for protected pages with shared layout (sidebar, nav).
- **shadcn/ui**: Add components via `pnpm dlx shadcn@latest add <component> --cwd apps/web`. Do not manually create shadcn components.

## Database

- Use Drizzle's `pgTable` for schema definitions in `apps/api/src/db/schema/`.
- Prefer `uuid` for primary keys (use `gen_random_uuid()` default).
- Always add `createdAt` and `updatedAt` timestamps to every table.
- Use snake_case for column names in the database, camelCase in TypeScript.
- After schema changes, run `pnpm db:generate` then `pnpm db:migrate`.

## Testing

- Vitest for all tests. Place test files next to source: `foo.ts` → `foo.test.ts`.
- Test services as pure functions. For route tests, use Hono's `app.request()` test helper — no need for supertest.
- IMPORTANT: Always run `pnpm test -- --run` after making changes to verify nothing is broken.

## Gotchas

- Hono's `c.json()` returns `Response`, not raw data. Don't try to destructure it.
- `@hono/zod-openapi` routes use `createRoute()` + `app.openapi()`, NOT regular `app.get()` / `app.post()`. Mixing them means the route won't appear in Scalar docs.
- Drizzle `select()` returns an array, even for single-row queries. Always destructure: `const [user] = await db.select()...`
- BullMQ workers must be started as a separate process (`apps/api/src/worker.ts`), not imported into the main Hono app.
- Vercel AI SDK's `generateObject()` with a Zod schema is the preferred way to get structured AI output. Avoid parsing raw text responses.
- pnpm workspace: when adding deps to a specific app, use `pnpm add <pkg> --filter api` or `--filter web`.
- Next.js App Router: `layout.tsx` files CANNOT be Client Components. If a layout needs client-side logic, extract it into a child Client Component.
- Next.js `fetch()` in Server Components caches by default. Use `{ cache: "no-store" }` for data that should always be fresh (like job application status).
- Do NOT import from `apps/api` directly into `apps/web`. Share types through `packages/shared` only.