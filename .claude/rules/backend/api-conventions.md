# API Conventions (Backend)

## Response Envelope

Every endpoint returns `{ success, data, error }`.
- Paginated endpoints add a `meta` object.
- Error responses include an `errorCode` field.
- Use `success: true as const` (not plain `true`) so TypeScript infers the literal type for OpenAPI.

## Date Serialization

Drizzle returns `Date` objects. Always serialize in route handlers before returning:
```ts
createdAt: result.createdAt.toISOString()
```
Services return raw data with Date objects; routes handle serialization.

## Foreign Keys

All foreign keys to `users` should use `onDelete: 'cascade'` so deleting a user cleans up their data.

## Shared Package

`packages/shared` — one file per domain (`auth.ts`, `application.ts`, etc.).
Export both the Zod schema and the inferred type. Barrel-export from `index.ts`.
