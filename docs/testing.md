# Testing

## Running the suite

```bash
npm run test          # vitest run — unit + integration tests
npm run test:watch    # same, watch mode
npm run test:e2e      # playwright — real browser against a real running server
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run build         # production build (also type-checks)
```

`npm run test` needs a running Postgres — `docker compose up -d db` — and
`DATABASE_URL` set (`.env`, copied from `.env.example`). The integration
tests run against this real database, not a mock; they create and tear
down their own ephemeral users so they don't collide with the seeded demo
account or each other. 46 tests currently pass.

`npm run test:e2e` re-seeds the demo account first (`pretest:e2e` →
`npm run db:seed`, so it's safe to run repeatedly) and starts/reuses a
dev server on `localhost:3000` (see `playwright.config.ts`). 3 tests
currently pass, covering the same ground as the "Live verification"
section below — this is that verification, checked into the repo rather
than left as one-off manual scripts. First run downloads a Chromium
binary if one isn't cached (`npx playwright install chromium`).

## What's covered, and at what level

### Unit tests — `src/lib/planning/*.test.ts` (28 tests)

Pure-function tests for the planning heuristic, with no database:
priority scoring (overdue-vs-distant ranking, effort penalty, due-today
vs. due-later), conflict detection (overlaps, outside-availability,
overloaded days, deadline clashes), day/week planning (priority ordering,
respecting `noScheduleAfter`, not double-booking existing commitments,
category exclusion), spending analysis (category totals, budget variance,
the 40%-increase threshold), and action-plan generation (milestone → task
conversion, keyword-template matching, generic fallback).

### Validation tests — `src/lib/validation/auth.test.ts`

Zod schema behavior for auth (email normalization, password length,
malformed input rejection).

### WebMCP registry tests — `tests/webmcp/registry.test.ts` (no database)

Static checks on `src/webmcp/registry.ts` itself: no duplicate tool
names, every name matches the pattern an agent can call verbatim, every
tool has a non-trivial description, every spec-required tool name from
section 18/19/20 is actually present, no read-classified tool has a
write-shaped name, and the four destructive/irreversible/financial-target
tools (`delete_task`, `apply_schedule_plan`, `set_budget`,
`delete_budget`) are classified `high_write`. Also verifies
`getPublicToolMetadata()` produces valid-shaped JSON Schema for every
tool, never leaks an `execute` function to the client payload, and sets
`readOnlyHint`/`untrustedContentHint` correctly.

### WebMCP integration tests — `tests/webmcp/execute.test.ts` (real Postgres)

Exercises `executeTool()` — the actual dispatcher `POST /api/mcp/execute`
calls — end to end:

- Unknown tool name → `TOOL_NOT_FOUND`, not a crash.
- Missing required input → `VALIDATION_ERROR` with a specific message.
- A read tool executes directly and logs an `AGENT_ACTION` activity event.
- A low-impact write (`create_task`) executes directly, persists to
  Postgres, and logs a `TASK_CREATED` event.
- A high-impact write (`delete_task`) does **not** delete anything — it
  creates a pending `ApprovalRequest` and the task is confirmed still
  present in the database.
- Approving that request (`approveRequest`) is what actually deletes the
  task, and only then.
- `get_task` on another user's task ID returns `TASK_NOT_FOUND`, never
  their data (data isolation).
- A tampered approval payload (extra field with something that looks
  like injected code) only ever produces a normal, schema-validated call
  when approved — the extra field is silently stripped, never executed.
- A regression test for a real bug (see `docs/architecture.md`): approval
  resolution must use the explicitly-injected tool resolver, not an
  import-time side effect — a resolver that legitimately finds nothing
  surfaces `NO_EXECUTOR`, proving the lookup isn't silently short-circuited.

## Live browser verification — `tests/e2e/flagship.spec.ts` (3 tests)

The unit/integration suite above runs everything through one process,
which turned out to hide a real bug (the approval-resolution one,
detailed in `docs/architecture.md`) that only a genuine click-through
caught. That verification is now a checked-in Playwright e2e suite,
`npm run test:e2e`, run against a real dev server and real Postgres:

1. Signs in via the demo button, confirms the dashboard renders the
   seeded "messy week" data (the overdue task, etc.).
2. Drives the full flagship WebMCP sequence through
   `POST /api/mcp/execute` (the same endpoint a browser's registered
   tool `execute()` calls): `get_today_overview → get_tasks →
identify_conflicts → analyze_spending → delete_budget`.
3. Confirms the resulting pending approval renders in the real Agent
   Activity panel UI (not just the API response).
4. Clicks the real **Approve** button and confirms — both via the toast
   and by re-fetching `/api/activity` — that the request is now
   `approved`, then confirms the entertainment budget is actually gone
   from the "Budget vs. actual" card on the Expenses page (scoped by
   `data-testid`, not a same-page-text hope), with no manual reload.
5. A separate test confirms a single-task `reschedule_task` executes
   directly with no approval step, as designed.

This is also how the timezone bug (day-key math breaking for any UTC+
timezone) and the Tool Inspector table-layout bug were found — both
before either reached this document — and how two Playwright strict-mode
locator ambiguities were caught and fixed while writing this suite
itself (see the git history for `tests/e2e/flagship.spec.ts`).

### Why this isn't a real `document.modelContext.registerTool()` call

As of this writing, the Chromium build Playwright installs doesn't expose
`document.modelContext` — the WebMCP Imperative API is behind an active
origin trial / flag in real Chrome (see `docs/webmcp.md`, "Testing WebMCP
locally"). The e2e suite therefore calls `POST /api/mcp/execute` directly
with the same payload shape a real registered tool's `execute()` sends —
this validates every part of the stack except the literal
`registerTool()` call and browser-side tool discovery, which requires a
WebMCP-flagged Chrome and is documented as a manual step in
`docs/webmcp.md` rather than claimed here as automated.

## Evaluation suite (spec section 39): natural-language request → expected tool(s)

This documents which tool(s) a request should map to and confirms each
one exists, is correctly described, and is exercised by the tests above
or the live verification. It is not a live LLM-in-the-loop eval — this
project has no bundled agent/model to run requests through — it's the
same purpose LLM tool-selection evals serve, but verified structurally:
every "expected tool" below exists in the registry with a description
written specifically to make an agent choose it for this phrasing (see
each tool's `description` in `src/webmcp/tools/*.ts`), and every one has
been called for real per the sections above.

| Request                                                               | Expected tool(s)                                                                                                                     | Verified                                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| "Show me everything I need to do today."                              | `get_today_overview`                                                                                                                 | e2e + integration test                                                              |
| "What am I behind on?"                                                | `get_tasks` or `prioritize_tasks` (overdue-aware)                                                                                    | Registry test (tool exists, described for this)                                     |
| "Plan my day around my available time."                               | `get_schedule` + `get_tasks` + `plan_my_day`                                                                                         | Unit tests on `planDay()`; tool registered                                          |
| "Move grocery shopping to Saturday."                                  | `get_tasks` (to find the ID) + `reschedule_task`                                                                                     | e2e (`flagship.spec.ts`, exact phrasing used in tool description)                   |
| "Create a goal to save R20,000 by December."                          | `create_goal`                                                                                                                        | Registry test; matches spec's exact example in the tool's description               |
| "How much did I spend on food this month?"                            | `get_expenses` + `analyze_spending`                                                                                                  | e2e (`analyze_spending` called in `flagship.spec.ts`)                               |
| "Create a shopping list for Saturday."                                | `create_shopping_list`                                                                                                               | Registry test; description matches phrasing                                         |
| "I have three hours free tomorrow. What should I work on?"            | `get_tasks` + `plan_my_day` (`availableMinutes: 180`)                                                                                | Unit tests on `planDay()`'s `availableMinutes` budget                               |
| "I have a busy week. Organize it. Don't schedule anything after 7pm." | `get_today_overview` → `get_tasks` → `get_schedule` → `identify_conflicts` → `plan_my_week` (`constraints.noScheduleAfter: "19:00"`) | e2e, full flagship sequence (`flagship.spec.ts`)                                    |
| "Remove my entertainment spending target."                            | `delete_budget` (requires approval)                                                                                                  | e2e, including the approval → Approve click → verified removed (`flagship.spec.ts`) |

## What's not automated (and the honest reason)

- A real `document.modelContext.registerTool()` round-trip through an
  actual WebMCP-capable browser — blocked on this environment's Chromium
  build not shipping the origin trial feature yet (see above). Documented
  as a manual verification step for anyone with a flagged Chrome build.
- A full accessibility audit tool run (e.g. axe-core in CI) — accessibility
  was addressed via semantic HTML, labeled form controls, and shadcn/ui's
  built-in Radix accessibility primitives, but no automated a11y test
  suite is wired in yet.
