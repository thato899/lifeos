# Why add an AI Coach to LifeOS?

LifeOS already organizes tasks, deadlines, schedules, and goals. People still
have to connect those pieces when deciding what to do next. The AI Coach turns
that personal context into a short, practical suggestion, such as choosing a
focus for today or finding time to make progress on a goal. It now receives
LifeOS's existing deterministic day plan, so the model can explain a feasible
plan instead of guessing how much time is free.

The coach is deliberately advisory. LifeOS already has working deterministic
planning and explicit approval gates for consequential changes. A model can be
useful for explaining tradeoffs and adapting suggestions to a person's wording,
but it should not silently move calendar blocks, change goals, or write to a
user's account. Suggestions stay visible for the person to accept, ignore, or
turn into actions themselves.

## What the first version sends

When a signed-in user asks a question, the server sends DeepSeek the question
and a compact snapshot containing the current top priorities, overdue and
upcoming deadlines, today's schedule, active goals, and scheduling cutoff. It
does not send account credentials, email addresses, or database IDs. The page
discloses this before the user submits a request. The key remains in a
server-only environment variable and is never sent to the browser.

## Boundaries

- The coach only reads the signed-in user's data through the existing server
  auth boundary.
- Model output is displayed as plain text and never executed as a command.
- It cannot create, edit, or delete LifeOS data.
- Requests are length-limited and rate-limited per user.
- Up to three recent exchanges are held in page memory and sent to DeepSeek for
  follow-up questions; they are not persisted to the database.
- If DeepSeek is not configured, the page explains that `DEEPSEEK_API_KEY` is
  needed and the rest of LifeOS remains usable.

## Hackathon eligibility note

This implementation is based on the existing LifeOS codebase. The Build With
AI: Basics Devpost rules require a new project started from an empty folder
during the submission period, so this branch is useful as a LifeOS feature but
does not satisfy that specific submission requirement.
