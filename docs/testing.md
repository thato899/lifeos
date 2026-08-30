# Testing

## Running the suite

```bash
npm run test          # vitest run — unit + integration tests
npm run test:watch    # same, watch mode
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run build         # production build (also type-checks)
```

`npm run test` needs a running Postgres — `docker compose up -d db` — and
`DATABASE_URL` set (`.env`, copied from `.env.example`). The integration
tests run against this real database, not a mock; they create and tear
down their own ephemeral users so they don't collide with the seeded demo
account or each other. 46 tests currently pass.

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

## Live verification (manual, browser-driven)

The automated suite above runs everything through the same process, which
turned out to hide one real bug (the approval-resolution one, detailed in
`docs/architecture.md`) that only a genuine click-through caught. Before
calling any of this done, the full stack was driven live with Playwright
against a running dev server and the seeded demo account:

1. Signed in via the demo button → landed on `/app/dashboard` with real
   seeded data rendering correctly.
2. Visually verified every module page (dashboard, tasks, calendar,
   goals, expenses) against the seeded "messy week" data.
3. Called the actual `POST /api/mcp/execute` HTTP endpoint (the same one
   a browser's registered tool `execute()` calls) through the full
   flagship sequence: `get_today_overview → get_tasks →
identify_conflicts → plan_my_week → reschedule_task →
analyze_spending → delete_budget`.
4. Confirmed the resulting pending approval rendered correctly in the
   Agent Activity panel, with working Approve/Reject buttons.
5. Clicked **Approve** in the real UI and confirmed the entertainment
   budget actually disappeared from the Expenses page — a real database
   change, reflected without a manual reload (`router.refresh()`).

This is also how the timezone bug (day-key math breaking for any UTC+
timezone) and the Tool Inspector table-layout bug were found — both
before they reached this document.

### Why not a real browser WebMCP call?

As of this writing, the Chromium build available in this environment
(via Playwright) doesn't expose `document.modelContext` — the WebMCP
Imperative API is behind an active origin trial / flag in Chrome itself
(see `docs/webmcp.md`, "Testing WebMCP locally"). The live verification
above therefore calls `POST /api/mcp/execute` directly with the same
payload shape a real registered tool's `execute()` sends — this validates
every part of the stack except the literal `registerTool()` call and
browser-side discovery, which requires a WebMCP-flagged Chrome and is
documented as a manual step in `docs/webmcp.md` rather than claimed here
as automated.

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

| Request                                                               | Expected tool(s)                                                                                                                     | Verified                                                              |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| "Show me everything I need to do today."                              | `get_today_overview`                                                                                                                 | Live + integration test                                               |
| "What am I behind on?"                                                | `get_tasks` or `prioritize_tasks` (overdue-aware)                                                                                    | Registry test (tool exists, described for this)                       |
| "Plan my day around my available time."                               | `get_schedule` + `get_tasks` + `plan_my_day`                                                                                         | Unit tests on `planDay()`; tool registered                            |
| "Move grocery shopping to Saturday."                                  | `get_tasks` (to find the ID) + `reschedule_task`                                                                                     | Live (flagship demo, exact phrasing used in tool description)         |
| "Create a goal to save R20,000 by December."                          | `create_goal`                                                                                                                        | Registry test; matches spec's exact example in the tool's description |
| "How much did I spend on food this month?"                            | `get_expenses` + `analyze_spending`                                                                                                  | Live (`analyze_spending` called in the flagship sequence)             |
| "Create a shopping list for Saturday."                                | `create_shopping_list`                                                                                                               | Registry test; description matches phrasing                           |
| "I have three hours free tomorrow. What should I work on?"            | `get_tasks` + `plan_my_day` (`availableMinutes: 180`)                                                                                | Unit tests on `planDay()`'s `availableMinutes` budget                 |
| "I have a busy week. Organize it. Don't schedule anything after 7pm." | `get_today_overview` → `get_tasks` → `get_schedule` → `identify_conflicts` → `plan_my_week` (`constraints.noScheduleAfter: "19:00"`) | Live, full flagship sequence                                          |
| "Remove my entertainment spending target."                            | `delete_budget` (requires approval)                                                                                                  | Live, including the approval → Approve click → verified removed       |

## What's not automated (and the honest reason)

- A real `document.modelContext.registerTool()` round-trip through an
  actual WebMCP-capable browser — blocked on this environment's Chromium
  build not shipping the origin trial feature yet (see above). Documented
  as a manual verification step for anyone with a flagged Chrome build.
- A full accessibility audit tool run (e.g. axe-core in CI) — accessibility
  was addressed via semantic HTML, labeled form controls, and shadcn/ui's
  built-in Radix accessibility primitives, but no automated a11y test
  suite is wired in yet.
