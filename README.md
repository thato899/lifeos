# LifeOS

**Your life. Your agent. One workspace.**

LifeOS is a personal command center — tasks, calendar, goals, shopping,
expenses, and routines — built so a human and an AI agent can operate it
_together_, through [WebMCP](https://webmachinelearning.github.io/webmcp/),
rather than one being a chatbot bolted onto the other's dashboard.

Built for the **OpenAI WebMCP Challenge 2026**.

---

## 1. What LifeOS is

Most personal-productivity tools give an agent one option: pretend to be
a human and click around the UI, guessing what each button does. LifeOS
instead exposes 35 real, described, schema-validated tools through
`document.modelContext.registerTool()` — an agent can read your tasks,
check your calendar for conflicts, propose a week's schedule, record an
expense, or create a goal's action plan by calling a tool with structured
input, the same way it would call any API, except this API is the actual
website you're looking at.

Every module also has a complete, polished manual UI. An agent makes
LifeOS faster and more consistent to operate — it never gates access to
anything a human can already do by hand.

## 2. Why WebMCP matters here

```
Traditional browser automation:      With WebMCP:
Agent sees UI → guesses which        Agent discovers an explicit tool
button → clicks → waits → guesses    → validates structured input
the next state                       → invokes it → LifeOS updates its
                                      real state → typed result returned
```

Full write-up, including the exact spec fields used
(`title`, `annotations.readOnlyHint`, `annotations.untrustedContentHint`)
and why they matter for LifeOS's prompt-injection defense:
**[docs/webmcp.md](docs/webmcp.md)**.

## 3. Human ⇄ agent workflow

```
Human intent → Agent → WebMCP tool call → LifeOS state change
   → Updated UI → Human reviews/modifies → Agent adapts
```

Example, verified live end-to-end (see [docs/testing.md](docs/testing.md)):

> **You:** "I have a busy week. Organize it. Don't schedule anything after 7pm."
> **Agent:** calls `get_today_overview`, `get_tasks`, `get_schedule`,
> `identify_conflicts`, `plan_my_week` — then presents a proposal.
> **You:** "Move grocery shopping to Saturday."
> **Agent:** calls `reschedule_task` — the calendar updates immediately.
> **You:** "Remove my entertainment spending target."
> **Agent:** calls `delete_budget` — this changes a financial target, so
> it asks for your approval first. You click **Approve**. Only then does
> it happen.

Full demo script: **[docs/demo.md](docs/demo.md)**.

## 4. Architecture

Next.js 16 (App Router) + PostgreSQL (Prisma 7) + Auth.js v5. One rule
underpins everything: a human clicking a button and an agent calling a
WebMCP tool both end up calling the _same_ function in `src/services/*`
— there is no separate, potentially-drifted "agent path" through the
data. Full write-up, including the project layout and two real
Next.js-16/Prisma-7-specific issues found and fixed along the way:
**[docs/architecture.md](docs/architecture.md)**.

## 5. Available tools

35 tools across three risk tiers (read / write / needs-approval) — full
catalog with descriptions: **[docs/webmcp.md](docs/webmcp.md#the-full-tool-catalog-35-tools)**.

Read: `get_today_overview`, `get_tasks`, `get_task`, `get_schedule`,
`get_goals`, `get_shopping_list`, `get_expenses`, `get_routines`,
`analyze_day`, `identify_conflicts`, `prioritize_tasks`,
`analyze_spending`, `plan_my_day`, `plan_my_week`.

Write: `create_task`, `update_task`, `complete_task`, `reopen_task`,
`create_schedule_block`, `reschedule_task`, `create_goal`, `update_goal`,
`update_goal_progress`, `create_action_plan`, `create_shopping_list`,
`add_shopping_item`, `update_shopping_item`, `remove_shopping_item`,
`record_expense`, `create_routine`, `update_routine`.

Needs approval (destructive / irreversible / financial-target changes):
`delete_task`, `apply_schedule_plan`, `set_budget`, `delete_budget`.

## 6. Run locally

Requires Node.js 22+, Docker (for local Postgres), and npm.

```bash
git clone <this-repo>
cd lifeos
npm install
cp .env.example .env          # defaults match docker-compose.yml
docker compose up -d db       # starts Postgres
npx prisma migrate deploy     # applies the schema
npm run db:seed               # seeds the demo account (Alex's messy week)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with **Try
the demo** (`alex@demo.lifeos.app` / `lifeos-demo`), or create your own
account.

Useful scripts: `npm run db:studio` (Prisma Studio), `npm run test`,
`npm run typecheck`, `npm run lint`, `npm run build`.

## 7. Enable WebMCP in Chrome

1. `chrome://flags/#enable-webmcp-testing` → Enabled → relaunch (Chrome
   149+; this is an active origin trial and the requirement may evolve —
   see [developer.chrome.com/docs/ai/webmcp](https://developer.chrome.com/docs/ai/webmcp)
   for the current word).
2. Sign in to LifeOS. The "WebMCP" status pill in the header should read
   **Available · 35 tools** once `document.modelContext` is detected.
3. `/app/activity` → "WebMCP tool inspector" lists every registered tool
   live, with its schema and last-run time.

Full instructions and what's actually been verified vs. what requires a
WebMCP-flagged browser to check yourself:
**[docs/webmcp.md](docs/webmcp.md#testing-webmcp-locally)**.

## 8. Testing

```bash
docker compose up -d db
npm run test
```

46 tests: unit tests for the planning heuristic (priority scoring,
conflict detection, day/week planning, spending analysis), WebMCP
registry sanity checks, and real integration tests against Postgres
covering validation, the approval-gating flow (a task is _not_ deleted
until approved), and cross-user data isolation. Full breakdown, the
spec-required natural-language evaluation table, and how the flagship
scenario was verified live in an actual browser:
**[docs/testing.md](docs/testing.md)**.

## 9. Security model

Agent → explicit tool → validated schema → authorized service →
database. Never arbitrary SQL, an arbitrary endpoint, or arbitrary code
execution. Every query is scoped to the authenticated user; every
high-impact write requires human approval; every tool treats its input
as untrusted; user-generated content is always data, never re-executed
as instructions. Full model, including the prompt-injection defense and
one known low-severity dev-dependency advisory:
**[docs/security.md](docs/security.md)**.

## 10. Deployment

Designed for Vercel (Next.js-native) + any managed Postgres (Vercel
Postgres, Neon, Supabase, or the same `docker-compose.yml` on a small VM
for a fixed demo URL).

```bash
# Environment variables required in production:
DATABASE_URL=...          # production Postgres connection string
AUTH_SECRET=...           # generate with: openssl rand -base64 32
NEXTAUTH_URL=https://...  # the deployed URL
LIFEOS_ENABLE_DEMO=true   # or "false" to disable the one-click demo

npx prisma migrate deploy
npm run db:seed           # optional, to have a demo account live
npm run build
npm start
```

HTTPS is required for WebMCP (`document.modelContext` is a
`[SecureContext]`-gated API per the spec) — any standard Vercel/HTTPS
deployment satisfies this automatically.

## 11. Hackathon demo workflow

The exact scenario, the seeded data behind it, and a suggested 3-minute
video script: **[docs/demo.md](docs/demo.md)**.

---

## Project structure

```
src/
  app/                  Next.js routes — public pages, /app/* (authenticated), api/mcp/*
  auth.ts, proxy.ts     Auth.js v5
  components/app/       human-UI React components
  components/webmcp/    client-side WebMCP registration, status, eventing
  components/ui/        shadcn/ui primitives
  lib/actions/          Server Actions (human-UI callers of the service layer)
  lib/planning/         pure business-logic heuristics (priority score, conflicts, scheduling, spending)
  lib/validation/       Zod schemas shared by Server Actions and WebMCP tools
  services/             the one business-logic layer both UI and WebMCP call
  webmcp/               tool definitions, registry, and the execute() dispatcher
prisma/                 schema.prisma, seed.ts
tests/                  integration + WebMCP tests (real Postgres)
docs/                   architecture.md, webmcp.md, security.md, testing.md, demo.md
```

## License

MIT — see [LICENSE](LICENSE).

## What LifeOS does NOT claim

No fake AI, no invented WebMCP APIs, no capabilities described here that
aren't actually implemented and runnable via the commands above. Where
something can't be fully verified in this environment (a real
`document.modelContext.registerTool()` round-trip through a
WebMCP-flagged browser), that's stated plainly in
[docs/testing.md](docs/testing.md) rather than claimed.
