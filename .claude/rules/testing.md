# Testing Requirements

## Minimum Test Coverage: 80%

Test Types (ALL required):
1. **Unit Tests** - Individual functions, utilities, components
2. **Integration Tests** - API endpoints, database operations
3. **E2E Tests** - Critical user flows (framework chosen per language)

## Test-Driven Development

MANDATORY workflow:
1. Write test first (RED)
2. Run test - it should FAIL
3. Write minimal implementation (GREEN)
4. Run test - it should PASS
5. Refactor (IMPROVE)
6. Verify coverage (80%+)

## Troubleshooting Test Failures

1. Use **tdd-guide** agent
2. Check test isolation
3. Verify mocks are correct
4. Fix implementation, not tests (unless tests are wrong)

## Agent Support

- **tdd-guide** - Use PROACTIVELY for new features, enforces write-tests-first

## Kariro Vitest Conventions

- **Route tests must mock ALL services** that `app.ts` imports, not just the one under test. Otherwise Vitest loads real modules and their transitive deps (db, bcrypt, etc.).
- **Mock order**: `vi.mock(...)` calls at top → `const service = await import(...)` → `const app = (await import('../app.js')).default`.
- **Bypass auth in protected-route tests**: mock `verifyAccessToken` to return `{ sub: userId, email }` and pass `Authorization: 'Bearer any-string'`.
- **Test env vars** live in `apps/api/vitest.config.ts` (no `.env.test` file).
