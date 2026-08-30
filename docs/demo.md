# Demo

**Live URL:** https://lifeos-nine-neon.vercel.app — click **Try the demo**,
no signup needed.

## Recorded walkthrough

`scripts/record-demo.mjs` drives a real browser through the exact
flagship scenario below against the live deployment and records it
(Playwright's `recordVideo`, captioned on-screen since there's no
narration audio):

```bash
node scripts/record-demo.mjs                              # against the live URL
node scripts/record-demo.mjs http://localhost:3000         # against a local dev server
```

Produces `demo-recording/demo.webm` (~2 min). **Honesty note, stated in
the video's own captions too:** the "agent" steps call
`POST /api/mcp/execute` directly — the exact payload shape a real
browser-registered WebMCP tool's `execute()` sends (see
`docs/webmcp.md`) — rather than a literal `document.modelContext`
round-trip, since no Chromium build available here yet ships that origin
trial feature. Everything else (the UI, the approval flow, the actual
database change) is the real thing. Re-run `npm run db:seed` (or the
production equivalent) afterward to reset the demo account, since the
script does perform real mutations (a reschedule and a budget deletion).

## Demo account

- **Email:** `alex@demo.lifeos.app`
- **Password:** `lifeos-demo`
- One-click via the **Try the demo** button on `/login` (calls
  `demoLoginAction`, gated behind `LIFEOS_ENABLE_DEMO=true` so a
  deployment can disable it — see `.env.example`).
- Seeded by `npm run db:seed` (`prisma/seed.ts`), safely re-runnable —
  it wipes and rebuilds only this account's data, on every run, with
  dates computed relative to "now" so the demo never looks stale.

### What's in the seed ("Alex's messy week")

- **Tasks:** an overdue "Submit project report" (urgent), "Pay
  electricity" (high, due in 3 days), "Buy groceries" (medium, due in 3
  days), "Study SQL" (medium, linked to the certification goal), a
  recurring "Exercise" task, and two tasks linked to the website goal.
- **Schedule:** a double-booked block tomorrow (client call vs. dentist
  appointment), a study session scheduled past the 7pm boundary, and a
  few ordinary work blocks — real, detectable conflicts, not staged text.
- **Goals:** "Complete certification" (40%, with milestones — one done,
  two pending), "Save R20,000" (25%), "Launch my website" (15%, with two
  linked tasks).
- **Shopping:** a "Groceries" list with Bread, Eggs, Chicken, Rice.
- **Expenses:** this month and last month, side by side, with
  entertainment spending roughly 4x over its R500 budget and a clean
  month-over-month baseline so `analyze_spending`'s "unusual increase"
  detector has something real to find.
- **Routine:** a 5-step daily morning routine.

## The flagship scenario (spec section 30)

This is what the product is built around, and it's the sequence actually
verified live end to end (see `docs/testing.md`):

**Human:** "I have a busy week. Help me organize it. I don't want
anything scheduled after 7 PM, and I need to save money this month."

**Agent**, via WebMCP:

1. `get_today_overview` — today's priorities, overdue tasks, schedule.
2. `get_tasks` — the full open task list.
3. `get_schedule` — what's already committed this week.
4. `identify_conflicts` — the double-booking and the past-7pm block, found automatically.
5. `get_goals` — active goals, for context.
6. `get_expenses` + `analyze_spending` — where the money's actually going.
7. `plan_my_week` (`constraints.noScheduleAfter: "19:00"`) — a proposed
   schedule that respects the 7pm boundary from the very first call, not
   as an afterthought filter.
8. The agent presents the proposal and the spending analysis.
9. Human reviews; nothing has been written to the calendar yet
   (`plan_my_week` is read-only — see `docs/webmcp.md`).

**Human:** "Move grocery shopping to Saturday."

**Agent:** calls `reschedule_task` directly (low-impact, single-task
change) — the calendar updates immediately, visible without a reload.

**Human:** "Remove my entertainment spending target and increase my
savings goal."

**Agent:** calls `delete_budget` — this is a financial-target change, so
it returns `approvalRequired: true` instead of executing. The agent tells
the human it needs approval. The human clicks **Approve** in the Agent
Activity panel; only then does the budget actually disappear from the
Expenses page.

## Suggested 3-minute video script

**0:00–0:20 — The problem.** Open the LifeOS landing page. _"Life is
fragmented across a calendar app, a to-do list, a notes app, and a
budget spreadsheet. LifeOS gives an agent structured tools to operate one
shared workspace instead."_

**0:20–0:45 — Show WebMCP is real, not decoration.** Sign in with the
demo account. Point at the "WebMCP · Available · 35 tools" pill in the
header. Open `/app/activity` → WebMCP tool inspector. _"These aren't
buttons the agent has to guess how to click — they're explicit,
described, schema-validated tools the browser itself registers."_

**0:45–1:20 — The flagship request.** Type (or speak, to whatever agent
surface is driving the browser): _"I have a busy week. Organize it.
Don't schedule anything after 7pm."_ Show the Agent Activity panel
filling in live: `get_today_overview → get_tasks → get_schedule →
identify_conflicts → plan_my_week`. Show the resulting plan.

**1:20–1:45 — The human adjusts.** _"Move grocery shopping to
Saturday."_ Watch `reschedule_task` fire and the calendar update
immediately, no page reload.

**1:45–2:10 — A financial question, and a gated change.** _"How much
did I spend on food this month?"_ → `get_expenses` +
`analyze_spending`. Then: _"Remove my entertainment spending target."_
→ `delete_budget` returns an approval request instead of doing anything.
Show the Approve button; click it; show the budget gone.

**2:10–2:30 — Action plan.** _"Create an action plan for my goal to
launch my website."_ → `get_goals` (or the agent already has the ID) →
`create_action_plan`. Show new tasks appear on the Tasks page, linked to
the goal.

**2:30–2:50 — Close on the activity log.** Scroll the full Agent
Activity feed. _"The important part isn't that the agent pretended to
use LifeOS — every one of these lines is a real, validated tool call
that actually changed data, the same data a human editing the app by
hand would change."_

**2:50–3:00 — Close.** _"LifeOS: your life, your agent, one workspace."_

## Repeating the demo

`npm run db:seed` resets the demo account to its starting state at any
time — safe to run before every take.
