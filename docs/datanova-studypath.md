# StudyPath for DataNova DN-ED-01

StudyPath is a learning-path prototype inside LifeOS, aligned with DataNova's
Adaptive Learning Path Recommendation education problem statement. It uses a
small prerequisite graph and learner check-in data to suggest a sequence of
Python and data-analysis skills.

## What the prototype does

- Lets a learner choose a target skill, weekly study budget, and preferred
  session length.
- Offers three-question skill checks across a seven-topic Python curriculum.
- Stores check-in scores locally in the current browser and updates the
  learner's path immediately.
- Imports and exports a documented CSV format for learner practice records.
- Validates imported topic IDs, scores, elapsed days, and session durations in
  the browser; imported data is not uploaded to the app or an AI provider.
- Explains why each skill is recommended, using mastery, practice recency,
  goal relevance, and prerequisite relationships.
- Can generate an optional topic-only micro-lesson through the configured
  DeepSeek API. Learner scores, goals, and imported records are not sent.
- Shows a transparent estimated study duration and per-skill mastery signals.

## Recommendation method

The curriculum is a directed acyclic graph. The path builder finds the
prerequisite closure of the selected goal and topologically chooses skills so
that unmastered prerequisites appear before dependent skills. Topics already
at or above the mastery threshold can be skipped unless they are the goal.

For each topic with check-ins, the recent score is calculated as an
exponentially weighted mean, with a 21-day decay time constant. It is then
adjusted by a freshness factor based on the age of the latest practice, using a
45-day scale. The planner prioritizes lower mastery, stale or missing practice
evidence, direct goal relevance, and topics that fit the learner's preferred
session length.

This is an explainable baseline recommender, not a trained collaborative
filter. It does not claim validated learning outcomes. A larger evaluation
should compare different recommendation strategies using consented, anonymized
learning records and metrics such as skill-check improvement, completion, and
return-to-practice rate.

## Data and privacy

The initial interface uses a clearly labeled synthetic sample learner profile
for demonstration. New quiz scores and validated CSV imports are stored in
browser local storage; no learning check-in data is sent to DeepSeek or another
AI provider. The optional lesson request sends only the selected curriculum
topic's public title and description to DeepSeek; the server holds the API key.
Learners can export their records or clear them by resetting the sample profile
or clearing browser site data. The existing LifeOS app authentication still
gates access to the route.

## Existing work disclosure

This is an extension of the existing LifeOS codebase. The StudyPath learning
module is the new competition-focused work; the pre-existing application
features are not claimed as new work. Confirm the organizer's rules on
pre-existing projects before submission, because the Devpost rules page was
not accessible during implementation.
