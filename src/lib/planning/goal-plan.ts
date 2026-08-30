export interface GoalMilestoneLite {
  id: string;
  title: string;
  targetDate: Date | null;
  completed: boolean;
}

export interface GoalLite {
  id: string;
  title: string;
  category: string | null;
  targetDate: Date | null;
}

export interface SuggestedTask {
  title: string;
  dueDate: Date | null;
  source: "milestone" | "template";
}

// Small, honest keyword-matched template library — deliberately not framed
// as AI-generated. See docs/architecture.md "No fake AI": this is a rule
// lookup, and create_action_plan's tool description says so.
const TEMPLATES: { keywords: string[]; steps: string[] }[] = [
  {
    keywords: ["website", "site", "launch", "app", "product"],
    steps: [
      "Define the scope and must-have features",
      "Design the core pages/screens",
      "Build the first working version",
      "Test with a few real users",
      "Deploy and share it publicly",
    ],
  },
  {
    keywords: ["save", "saving", "money", "budget", "finance"],
    steps: [
      "Set a monthly savings target",
      "Track spending for one full month",
      "Cut one recurring non-essential expense",
      "Automate a transfer to savings each payday",
      "Review progress at the end of the month",
    ],
  },
  {
    keywords: ["exercise", "fitness", "gym", "run", "health", "workout"],
    steps: [
      "Pick a weekly workout schedule",
      "Book or set up the first session",
      "Track progress for two weeks",
      "Adjust the plan based on how it feels",
    ],
  },
  {
    keywords: ["degree", "certificat", "course", "study", "learn", "exam"],
    steps: [
      "List the remaining requirements",
      "Block recurring study time each week",
      "Complete the next module or assignment",
      "Schedule the next assessment or exam",
    ],
  },
  {
    keywords: ["career", "job", "promotion", "business"],
    steps: [
      "Clarify what success looks like",
      "Identify the skill or gap to close first",
      "Take one concrete step this week",
      "Ask for feedback from someone ahead of you",
    ],
  },
];

const FALLBACK_STEPS = [
  "Define exactly what done looks like",
  "Break the goal into smaller steps",
  "Schedule the first work session",
  "Review progress and adjust the plan",
];

/**
 * LifeOS's action-plan heuristic. If the goal already has milestones, each
 * incomplete milestone becomes a task directly. Otherwise, this does a
 * simple keyword match against a small template library and falls back to a
 * generic 4-step decomposition. This is intentionally not framed as an
 * AI-generated plan — it's a transparent starting point the user (or agent,
 * on their behalf) is expected to edit.
 */
export function generateActionPlan(
  goal: GoalLite,
  milestones: GoalMilestoneLite[],
): SuggestedTask[] {
  const incompleteMilestones = milestones.filter((m) => !m.completed);
  if (incompleteMilestones.length > 0) {
    return incompleteMilestones.map((m) => ({
      title: m.title,
      dueDate: m.targetDate,
      source: "milestone" as const,
    }));
  }

  const haystack = `${goal.title} ${goal.category ?? ""}`.toLowerCase();
  const match = TEMPLATES.find((t) =>
    t.keywords.some((k) => haystack.includes(k)),
  );
  const steps = match?.steps ?? FALLBACK_STEPS;

  return steps.map((title) => ({
    title,
    dueDate: null,
    source: "template" as const,
  }));
}
