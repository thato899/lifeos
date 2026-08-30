# Architecture

LifeOS is a Next.js 16 (App Router) application backed by PostgreSQL. This
document covers how it's put together and why — the engineering decisions
that aren't obvious from reading the code alone.

## The one rule everything else follows

```
Human UI (Server Actions)  ──┐
                              ├──▶  Service layer  ──▶  Prisma  ──▶  PostgreSQL
WebMCP tools (agent)       ──┘         (src/services/*)
```

Both a human clicking a button and an agent calling a WebMCP tool end up
calling the exact same function in `src/services/*`, differing only in the
`actor` they pass (`"human"` or `"agent"`). Neither path talks to Prisma
directly. This is what spec section 43 ("service layer") and section 34
("state management") are asking for, and it's the reason the human UI and
the agent can never drift into showing different data or enforcing
different rules — there's only one rule-enforcing code path to drift from.

Concretely: `src/lib/actions/tasks.ts` (a `"use server"` module used by
`<form action={...}>` in React) and `src/webmcp/tools/task.ts` (a WebMCP
tool definition) both end up calling `src/services/task.service.ts`'s
`createTask()`. Neither validates or authorizes independently — that logic
lives once, in the service.

## Project layout

```
src/
  app/                  Next.js routes
    (public)            /  and  /login
    app/                the authenticated app (/app/*), one route per module
    api/mcp/tools        GET  — public WebMCP tool metadata for the browser
    api/mcp/execute       POST — the WebMCP tool dispatcher
    api/activity          GET  — activity feed for the Agent Activity panel
  auth.ts, auth.config.ts, proxy.ts   Auth.js v5 setup (see below)
  components/
    app/                human-UI React components (one per module + shell)
    webmcp/             the client-side WebMCP registration + status/eventing
    ui/                 shadcn/ui primitives
  lib/
    actions/            Server Actions — the human-UI callers of services
    activity/           the ActivityEvent log (append-only, shared by both surfaces)
    errors/             AppError + the ServiceResult shape every service returns
    planning/           pure business logic (no Prisma, no Next) — see below
    validation/         Zod schemas, shared by Server Actions and WebMCP tools
  services/             the service layer described above
  webmcp/               tool definitions, registry, execute() dispatcher
prisma/
  schema.prisma         data model
  seed.ts               demo data ("Alex's messy week")
tests/                  integration tests (real Postgres) + WebMCP registry tests
src/**/*.test.ts        unit tests, colocated with the code they test
docs/                   this file, webmcp.md, security.md, testing.md, demo.md
```

## The planning engine (`src/lib/planning/*`)

Priority scoring, conflict detection, day/week planning, and spending
analysis are implemented as pure functions over plain data (`TaskLite`,
`ScheduleBlockLite`, `ExpenseLite`, …) — no Prisma types, no database
access. `src/services/overview.service.ts` is the only place that fetches
data and feeds it into these functions. This split exists for one reason:
these functions are the actual "intelligence" of LifeOS's planning
heuristic, and they're trivially unit-testable in isolation (see
`src/lib/planning/*.test.ts`, 28 tests). None of it is a real optimizer —
see `docs/webmcp.md` and the code comments for what "LifeOS's planning
heuristic" honestly means and doesn't mean.

## Data model

See `prisma/schema.prisma` for the full picture; the design notes at the
top of that file explain the reasoning for each modeling choice (why
`ActivityEvent` is one append-only table rather than per-domain audit
logs, why recurrence is a JSON blob rather than a dozen nullable columns,
why `Category` and `ExpenseCategory` are different things). A few points
worth calling out:

- Every user-owned row carries `userId`, and every query in every service
  function filters on it. There is no "trust the ID, it's unique anyway"
  shortcut anywhere — see `docs/security.md`.
- `ActivityEvent` and `ApprovalRequest` are the backbone of the WebMCP
  story, not an afterthought bolted on. They're written to by the service
  layer itself (`src/lib/activity/log.ts`), so they can't be forgotten by
  a future tool or Server Action the way a separately-maintained log could
  be.

## Notable framework/library decisions (and why)

This project pins to genuinely current major versions (Next.js 16, Prisma
7, Zod 4), which turned out to matter — each broke an assumption from
common tutorials, verified against the frameworks' own bundled docs /
current official docs rather than guessed:

- **Next.js 16** renamed `middleware.ts` to `proxy.ts` (`src/proxy.ts`) and
  made dynamic route params/searchParams async (`await params`). Next 16
  actually ships its breaking-change notes as markdown files inside
  `node_modules/next/dist/docs/` specifically so an AI agent editing the
  repo reads them before writing code that assumes an older API — that's
  where this was caught, not from prior training data.
- **Prisma 7** removed the Rust query engine. The schema's `datasource`
  block no longer takes a `url`; `prisma migrate`/`studio` read it from
  `prisma7.config.ts` instead, and the running app's `PrismaClient` gets
  its connection via an explicit driver adapter
  (`@prisma/adapter-pg`, wired up in `src/lib/db.ts`) rather than reading
  `DATABASE_URL` itself. Two different places, two different mechanisms —
  documented inline in both files since it's an easy thing to "fix" wrong.
- **Zod 4** has a built-in `z.toJSONSchema()`. This is what turns every
  tool's Zod input schema into the JSON Schema WebMCP's `registerTool`
  actually requires (`src/webmcp/public-tools.ts`) — no separate
  schema-conversion library needed, and the tool's runtime validation and
  its advertised schema can never drift apart because they're the same
  object.

## State management / "why does the UI update when an agent does something"

There's no client-side global store mirroring server state. After a
WebMCP tool call, the browser calls `router.refresh()` (Next.js's
built-in mechanism to re-run Server Components with fresh data) — see
`src/components/webmcp/webmcp-provider.tsx`. The human-UI Server Actions
call `revalidatePath("/app")` for the same reason. Either way, the "single
source of truth" is Postgres, re-read on every navigation/refresh; nothing
is cached client-side longer than a page's lifetime.

For instant feedback in the tab that actually made a WebMCP call (before
the page even finishes refreshing), there's a small client-only event bus
(`src/components/webmcp/webmcp-events.ts`) that the Agent Activity panel
and Tool Inspector subscribe to. It's explicitly a UX convenience, not a
data source — the durable record is always the `ActivityEvent` table,
fetched via `/api/activity`.

## A real bug this architecture caught (and what it teaches)

Early in development, "Approve" in the UI failed with a "no handler
registered" error despite 45 passing tests. The cause: the code that ran
an approved tool call looked up its executor in a `Map` populated by a
side effect at import time in `src/webmcp/registry.ts`. That worked in the
test suite (which imports `registry.ts` transitively) and in the WebMCP
dispatch route (same reason) — but the "Approve" button is a _separate_
Server Action module that never imported `registry.ts`, so in Next.js's
compiled output the registration side effect simply never ran on that code
path.

The fix was to stop relying on import-order side effects entirely:
`approveRequest()` now takes the tool resolver as an explicit parameter
(`src/services/approval.service.ts`'s `ExecutableTool`/`resolveTool`), and
every caller passes `getTool` from `webmcp/registry.ts` directly. A
regression test (`tests/webmcp/execute.test.ts`) pins this down by
resolving with a stub that deliberately returns nothing. This was only
caught by an actual browser click-through (via Playwright, since Chromium
doesn't yet support the real WebMCP origin trial) — a reminder that
module-load-order side effects are exactly the kind of bug automated
tests sharing one process can hide.
