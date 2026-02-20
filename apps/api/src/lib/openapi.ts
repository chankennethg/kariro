export const apiDescription = `AI-powered job application tracker API.

## Authentication

All protected endpoints require a Bearer token in the \`Authorization\` header. Obtain tokens via \`POST /auth/register\` or \`POST /auth/login\`. Access tokens expire in 15 minutes; use \`POST /auth/refresh\` to rotate.

## Rate Limits

All rate limits are per-IP using a sliding window. When exceeded, the API returns \`429 Too Many Requests\` with a \`Retry-After\` header.

| Scope | Window | Max Requests |
|-------|--------|-------------|
| **Global** (all endpoints) | 1 minute | 100 |
| **Auth** (\`/auth/*\`) | 15 minutes | 20 |
| **AI** (\`/ai/*\`) | 1 minute | 5 |

AI endpoints also enforce a **per-user queue limit** of 10 concurrent pending analyses.

## Security

- **CORS**: Restricted to allowed origins
- **Security headers**: HSTS, X-Content-Type-Options, X-Frame-Options
- **SSRF protection**: URL fetching blocks private IPs, cloud metadata endpoints, and non-HTTP(S) schemes; DNS resolution verified; redirects blocked; response size capped at 1 MB
- **Prompt injection mitigation**: User-provided content is sandboxed with delimiters and defensive system prompt instructions
- **Error sanitization**: Internal error details are logged server-side only; user-facing messages are sanitized

## Response Format

All endpoints return a consistent envelope:

\`\`\`json
{ "success": true, "data": { ... }, "error": null }
\`\`\`

Error responses include an \`errorCode\` field:

\`\`\`json
{ "success": false, "data": null, "error": "Message", "errorCode": "CODE" }
\`\`\`
`;
