# Security model

## The core principle

```
Agent → explicitly registered WebMCP tool → validated schema
      → authorized service function → database
```

An agent never gets arbitrary SQL, an arbitrary API endpoint, arbitrary
JavaScript execution, or an arbitrary database mutation. It gets exactly
35 named, described, schema-validated tools (`src/webmcp/registry.ts`),
and every one of them re-derives the caller's identity from the session
and re-checks ownership on every call — the same guarantee a human's
Server Action gets, because they call the same service functions
(`src/services/*`).

Every input is treated as untrusted, whether it arrives from a human
typing into a form or an agent constructing a tool call: tool arguments,
natural-language-derived values, IDs, dates, amounts. None of it is
trusted just because it's shaped correctly.

## Authentication

Auth.js v5 (`next-auth@beta`) with a Credentials provider — email +
bcrypt-hashed password, JWT sessions (required for Credentials; there's
no server-side session record to look up). See `src/auth.ts`,
`src/auth.config.ts`.

`src/proxy.ts` (Next.js 16's renamed `middleware.ts`) does an _optimistic_
redirect for obviously-unauthenticated requests to `/app/*` — this is
explicitly not the authorization boundary, per Next.js's own current
guidance on Proxy: it should not be used as a full session management or
authorization solution. The real boundary is `requireUserId()`
(`src/lib/auth-scope.ts`), called at the top of every service function,
every Server Action, and the WebMCP dispatcher. It re-derives the user ID
from the server-side session on every single call — never from a
client-supplied field — so a forged or reused ID in a tool argument can
never be used to read or write another user's data.

## Data isolation

Every user-owned Prisma model carries `userId`, and every query in every
service function filters on it explicitly — there is no
`findUnique({ where: { id } })` anywhere that skips the ownership check
because "the ID is unique anyway." A task lookup is always
`findFirst({ where: { id, userId } })`; if it returns nothing, the caller
gets `TASK_NOT_FOUND`, indistinguishable from a task that never existed.

This is exercised directly in `tests/webmcp/execute.test.ts`: one test
creates a task under a second test user and confirms `get_task` from the
first user's session returns `TASK_NOT_FOUND`, not the other user's data.

## WebMCP-specific security

- **Schema validation.** Every tool's input is parsed with its own Zod
  schema (`src/lib/validation/*`) before anything else happens. A missing
  required field or wrong type returns `VALIDATION_ERROR` with a specific
  message — it never reaches a service function with malformed data.
- **Authorization.** `requireUserId()` runs before the tool's `execute()`
  is even looked up. Risk-level gating (below) runs immediately after
  validation, before any database write.
- **Approval payload re-validation.** When a human approves a pending
  high-impact request, the stored `payload` JSON is re-parsed through the
  _same_ Zod schema the tool defines — not trusted as pre-validated just
  because it was validated once at creation time. `tests/webmcp/execute.test.ts`
  includes a test that stores a tampered payload (an extra field
  containing something that looks like code) and confirms approval only
  ever produces a normal, schema-shaped call — the extra field is
  silently stripped by Zod's default object parsing, never executed.
- **Rate limiting.** `src/lib/rate-limit.ts` — a per-user sliding window
  (30 calls / 10 seconds) on `POST /api/mcp/execute`. Documented
  limitation: this is in-process state, so a multi-instance deployment
  gets `limit × instance count` in practice. Fine for this project's
  single-instance deployment target; a production multi-instance
  deployment would move this to Redis or similar.
- **Safe error messages.** Every service function throws `AppError`
  (`src/lib/errors/app-error.ts`), which the dispatcher and Server Actions
  convert to `{ success: false, error: { code, message } }`. Anything
  that isn't an `AppError` — an unexpected Prisma error, a bug — is logged
  server-side and converted to a generic `INTERNAL_ERROR` message.
  No stack trace, driver error, or internal detail ever reaches the
  client or the agent.
- **Activity logging.** Every tool call — read or write — is logged to
  `ActivityEvent` (`src/lib/activity/log.ts`), with the acting tool name,
  a human-readable summary, and whether it required approval. This is
  the audit trail spec section 36 asks for, and it's the same table the
  human-facing Agent Activity panel reads from — there's no separate,
  easier-to-forget-to-write "security log."

## Human control / approval system

See `docs/webmcp.md`'s risk-classification table for which tools require
approval and why. The mechanism (`src/services/approval.service.ts`):

1. A high-impact tool call creates an `ApprovalRequest` row (status
   `pending`) instead of mutating anything, and returns
   `{ approvalRequired: true, approvalId, summary }` to the agent.
2. The pending request appears in the human's Agent Activity panel with
   Approve/Reject buttons.
3. Only `approveRequestAction` (a Server Action, human-triggered) can
   turn a pending request into a real change — and it re-validates the
   stored payload against the tool's schema before running it, per above.
4. An agent cannot approve its own request. There is no tool, WebMCP or
   otherwise, that transitions an `ApprovalRequest` to `approved`.

## Prompt injection

Covered in depth in `docs/webmcp.md` ("Prompt injection defense"). Summary:
task/goal/shopping-item text is always data, never re-interpreted as
instructions, and every read tool whose output includes user-authored
text is marked with the WebMCP spec's real `untrustedContentHint`
annotation so a calling agent's host knows not to treat it as trusted
instructions.

## What's deliberately NOT implemented (and why that's fine here)

- **No secrets in client code.** The only environment variables read
  client-side are none — `AUTH_SECRET` and `DATABASE_URL` are read only
  in server-only modules (`src/auth.ts`, `src/lib/db.ts`), which Next.js
  never bundles into client JavaScript.
- **No multi-tenant/enterprise features.** Out of scope per spec section
  6 — this is a single-user personal productivity app. Data isolation
  above is still enforced per-user because the schema supports multiple
  accounts (needed for the demo account to coexist with a real signup),
  but there's no organization/team/role model.
- **Known low-severity dev-dependency advisory:** `deepmerge-ts` (a
  transitive dependency of Prisma's own CLI config loader,
  `@prisma/config`) has a reported stack-exhaustion DoS when merging
  adversarial recursive objects. This only runs inside the Prisma CLI's
  own config-file merging at `prisma migrate`/`generate` time, over a
  config file this project authors itself (`prisma7.config.ts`) — it is
  not reachable from any user input or from the running application.
  No patched version exists yet without moving to the Prisma 8 release
  candidate, which this project deliberately avoids in favor of the
  stable 7.x line (see `docs/architecture.md`).
