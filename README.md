# Kariro

AI-powered job application tracker.

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-API-E36002?logo=hono&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)

## About

Kariro helps job seekers manage their entire job hunt from one place. Add applications and track them through a Kanban-style pipeline (Saved, Applied, Screening, Interview, Offer, Rejected). The AI layer analyzes job postings to extract structured data, score role fit, generate cover letters, and produce interview prep questions. A dashboard provides filtering, tagging, follow-up reminders, and analytics.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Hono + `@hono/zod-openapi` |
| Frontend | Next.js 16 (App Router) |
| Database | PostgreSQL 16 + Drizzle ORM |
| Queue | Redis + BullMQ |
| AI | Vercel AI SDK (OpenAI, Anthropic) |
| API Docs | Scalar |
| Testing | Vitest |
| Styling | Tailwind CSS + shadcn/ui |
| Monorepo | Turborepo + pnpm |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (for local PostgreSQL and Redis)

### Setup

```bash
# Clone the repo
git clone https://github.com/kennethchan/kariro.git
cd kariro

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example apps/api/.env

# Start PostgreSQL and Redis
docker compose up -d

# Run database migrations
pnpm db:migrate

# Start the dev servers
pnpm dev
```

The API runs at **http://localhost:4000** and the web app at **http://localhost:3000**.

Browse the API docs at **http://localhost:4000/docs**.

## Project Structure

```
kariro/
├── apps/
│   ├── api/                  # Hono API (port 4000)
│   │   └── src/
│   │       ├── routes/       # OpenAPI route definitions
│   │       ├── services/     # Business logic
│   │       ├── db/           # Drizzle schema & migrations
│   │       ├── middleware/    # Auth, errors, rate limiting
│   │       └── lib/          # Utilities, AI helpers, queue
│   └── web/                  # Next.js frontend (port 3000)
│       ├── app/              # App Router pages & layouts
│       ├── components/       # React components + shadcn/ui
│       └── lib/              # Client utilities & hooks
├── packages/
│   └── shared/               # Shared Zod schemas & types
├── docker-compose.yml
├── turbo.json
└── package.json
```

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run all apps in dev mode |
| `pnpm dev --filter api` | Run only the API |
| `pnpm dev --filter web` | Run only the frontend |
| `pnpm build` | Build all apps |
| `pnpm test` | Run all tests (watch mode) |
| `pnpm test -- --run` | Run tests once |
| `pnpm lint` | Lint all packages |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `docker compose up -d` | Start Postgres + Redis |
| `docker compose down` | Stop local services |

## API Documentation

The API is fully documented via OpenAPI 3.0. With the dev server running:

- **OpenAPI JSON spec** &mdash; `GET /api/v1/doc`
- **Scalar UI** &mdash; http://localhost:4000/docs

### Endpoint Groups

| Group | Base Path | Description |
|-------|-----------|-------------|
| Health | `/api/v1/health` | Liveness check |
| Applications | `/api/v1/applications` | CRUD for job applications |
| Tags | `/api/v1/tags` | Manage application tags |

## License

[MIT](LICENSE)
