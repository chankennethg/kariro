# API Conventions (Backend)

## Response Envelope

Every endpoint returns `{ success, data, error }`.
- Paginated endpoints add a `meta` object.
- Error responses include an `errorCode` field.
- Use `success: true as const` (not plain `true`) so TypeScript infers the literal type for OpenAPI.

## Error Handling Policy

### Every expected error MUST use AppError
Never let anticipated failures (duplicate records, missing resources, invalid input, auth failures) fall through as unhandled 500s. Wrap them in `AppError` with:
- A user-facing message (shown to the end user on the frontend)
- An HTTP status code (400, 401, 404, 409, 422, etc.)
- A machine-readable error code (`EMAIL_EXISTS`, `INVALID_CREDENTIALS`, etc.)

### Error messages MUST be meaningful to end users
BAD:  `"Internal server error"`, `"Database error"`, `"Something went wrong"`
GOOD: `"A user with this email already exists"`, `"Invalid email or password"`, `"Application not found"`

### Errors MUST propagate to the frontend
The full error flow: service throws `AppError` → error middleware formats it → BFF proxy forwards status + body unchanged → auth context reads `body.error` → form displays it. Never swallow or replace error messages along this chain.

### Database error detection
Drizzle wraps postgres errors in `DrizzleQueryError`. To detect specific postgres codes:
```ts
// Check both direct and wrapped error
if ('code' in err && err.code === '23505') return true;
if ('cause' in err && err.cause?.code === '23505') return true;
```

### Checklist for new endpoints
- [ ] All unique constraint violations caught and mapped to 409 with specific message
- [ ] All foreign key violations caught and mapped to 400/404 with specific message
- [ ] All not-found cases return 404 with `"<Resource> not found"`
- [ ] All auth failures return 401 with specific message (not "Unauthorized")
- [ ] Frontend displays the `error` field from the response

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
