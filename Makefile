.PHONY: dev build test lint lint-fix db-generate db-migrate db-studio docker-up docker-down

dev:
	pnpm dev

build:
	pnpm build

test:
	pnpm test -- --run

lint:
	pnpm lint

lint-fix:
	pnpm lint:fix

db-generate:
	pnpm db:generate

db-migrate:
	pnpm db:migrate

db-studio:
	pnpm db:studio

docker-up:
	docker compose up -d

docker-down:
	docker compose down
