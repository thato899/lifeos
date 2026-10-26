export type TopicId =
  | "python-basics"
  | "conditionals"
  | "loops"
  | "functions"
  | "collections"
  | "dataframes"
  | "visualization";

export type LearningQuestion = {
  prompt: string;
  options: string[];
  answer: number;
};

export type LearningTopic = {
  id: TopicId;
  title: string;
  description: string;
  durationMinutes: number;
  prerequisites: TopicId[];
  questions: LearningQuestion[];
};

export type PracticeAttempt = {
  topicId: TopicId;
  score: number;
  daysAgo: number;
  minutes: number;
};

export type LearnerProfile = {
  targetId: TopicId;
  weeklyMinutes: number;
  sessionMinutes: number;
  attempts: PracticeAttempt[];
};

export const CURRICULUM: LearningTopic[] = [
  {
    id: "python-basics",
    title: "Python foundations",
    description: "Values, variables, and reading simple expressions.",
    durationMinutes: 25,
    prerequisites: [],
    questions: [
      { prompt: "What is the result of 3 * 4?", options: ["7", "12", "34"], answer: 1 },
      { prompt: "Which value represents no value in Python?", options: ["None", "null", "void"], answer: 0 },
      { prompt: "What does len('data') return?", options: ["3", "4", "5"], answer: 1 },
    ],
  },
  {
    id: "conditionals",
    title: "Decisions with conditionals",
    description: "Use comparisons and if/elif/else to make a program respond.",
    durationMinutes: 20,
    prerequisites: ["python-basics"],
    questions: [
      { prompt: "Which operator checks equality?", options: ["=", "==", "==="], answer: 1 },
      { prompt: "What runs when an if condition is false and an else exists?", options: ["The else block", "Both blocks", "Neither block"], answer: 0 },
      { prompt: "What is 5 > 2 in Python?", options: ["True", "5", "False"], answer: 0 },
    ],
  },
  {
    id: "loops",
    title: "Loops and repetition",
    description: "Repeat a clear action with for and while loops.",
    durationMinutes: 25,
    prerequisites: ["conditionals"],
    questions: [
      { prompt: "How many values does range(3) produce?", options: ["2", "3", "4"], answer: 1 },
      { prompt: "Which loop is suited to each item in a list?", options: ["for", "if", "try"], answer: 0 },
      { prompt: "What does break do inside a loop?", options: ["Skips one iteration", "Ends the loop", "Restarts the loop"], answer: 1 },
    ],
  },
  {
    id: "functions",
    title: "Reusable functions",
    description: "Package a task into a named function with inputs and outputs.",
    durationMinutes: 25,
    prerequisites: ["python-basics"],
    questions: [
      { prompt: "Which keyword defines a function?", options: ["func", "def", "function"], answer: 1 },
      { prompt: "What does return do?", options: ["Sends a result back", "Prints every variable", "Repeats the function"], answer: 0 },
      { prompt: "In def add(a, b), what are a and b?", options: ["Arguments", "Loops", "Modules"], answer: 0 },
    ],
  },
  {
    id: "collections",
    title: "Lists and dictionaries",
    description: "Store, retrieve, and transform groups of related values.",
    durationMinutes: 30,
    prerequisites: ["loops"],
    questions: [
      { prompt: "What is the index of the first list item?", options: ["0", "1", "-1"], answer: 0 },
      { prompt: "A dictionary stores values using…", options: ["Keys", "Only positions", "Indentation"], answer: 0 },
      { prompt: "What does items.append(x) do?", options: ["Adds x to the end", "Removes x", "Sorts items"], answer: 0 },
    ],
  },
  {
    id: "dataframes",
    title: "Explore data with tables",
    description: "Filter, group, and summarize structured data with DataFrames.",
    durationMinutes: 35,
    prerequisites: ["functions", "collections"],
    questions: [
      { prompt: "A DataFrame is best described as…", options: ["A labeled 2D table", "A web server", "A single number"], answer: 0 },
      { prompt: "What does filtering rows help you do?", options: ["Select records by a condition", "Rename Python", "Install a library"], answer: 0 },
      { prompt: "Which summary finds a column's average?", options: ["mean", "shape", "head"], answer: 0 },
    ],
  },
  {
    id: "visualization",
    title: "Communicate with charts",
    description: "Choose a chart that makes a pattern or comparison easy to see.",
    durationMinutes: 25,
    prerequisites: ["dataframes"],
    questions: [
      { prompt: "Which chart is useful for comparing categories?", options: ["Bar chart", "Network packet", "Code block"], answer: 0 },
      { prompt: "What should a chart title communicate?", options: ["The key question or takeaway", "The author's password", "Nothing; titles are decorative"], answer: 0 },
      { prompt: "A line chart is commonly used to show…", options: ["Change over time", "A file's permissions", "A list of variable names"], answer: 0 },
    ],
  },
];

export const TARGET_OPTIONS: { id: TopicId; label: string }[] = [
  { id: "functions", label: "Write reusable Python functions" },
  { id: "dataframes", label: "Analyze a dataset with Python" },
  { id: "visualization", label: "Build a clear data story with charts" },
];

export function createSampleProfile(): LearnerProfile {
  return {
    targetId: "visualization",
    weeklyMinutes: 100,
    sessionMinutes: 25,
    attempts: [
      { topicId: "python-basics", score: 92, daysAgo: 14, minutes: 18 },
      { topicId: "conditionals", score: 76, daysAgo: 6, minutes: 22 },
      { topicId: "loops", score: 58, daysAgo: 3, minutes: 24 },
      { topicId: "functions", score: 84, daysAgo: 9, minutes: 20 },
      { topicId: "collections", score: 54, daysAgo: 2, minutes: 27 },
      { topicId: "dataframes", score: 42, daysAgo: 1, minutes: 31 },
    ],
  };
}

export function getTopicMastery(topicId: TopicId, attempts: PracticeAttempt[]) {
  const topicAttempts = attempts.filter((attempt) => attempt.topicId === topicId);
  if (topicAttempts.length === 0) return { score: 0, daysSincePractice: null as number | null, attempts: 0 };

  const weighted = topicAttempts.reduce(
    (acc, attempt) => {
      const weight = Math.exp(-Math.max(0, attempt.daysAgo) / 21);
      return { weightedScore: acc.weightedScore + attempt.score * weight, weightSum: acc.weightSum + weight };
    },
    { weightedScore: 0, weightSum: 0 },
  );
  const latest = Math.min(...topicAttempts.map((attempt) => Math.max(0, attempt.daysAgo)));
  const freshness = Math.exp(-latest / 45);
  const recentAccuracy = weighted.weightedScore / weighted.weightSum;
  return {
    score: Math.round(recentAccuracy * (0.8 + 0.2 * freshness)),
    daysSincePractice: latest,
    attempts: topicAttempts.length,
  };
}

export type PlanItem = {
  topic: LearningTopic;
  mastery: number;
  priority: number;
  reason: string;
};

export function recommendPath(profile: LearnerProfile): PlanItem[] {
  const byId = new Map(CURRICULUM.map((topic) => [topic.id, topic]));
  const required = new Set<TopicId>();
  function includePrerequisites(id: TopicId) {
    if (required.has(id)) return;
    required.add(id);
    for (const prerequisite of byId.get(id)?.prerequisites ?? []) includePrerequisites(prerequisite);
  }
  includePrerequisites(profile.targetId);

  const mastery = new Map<TopicId, number>();
  const recency = new Map<TopicId, number | null>();
  for (const topic of CURRICULUM) {
    const signal = getTopicMastery(topic.id, profile.attempts);
    mastery.set(topic.id, signal.score);
    recency.set(topic.id, signal.daysSincePractice);
  }

  const planned = new Set<TopicId>();
  const remaining = new Set(
    [...required].filter((id) => id === profile.targetId || (mastery.get(id) ?? 0) < 82),
  );
  const plan: PlanItem[] = [];
  while (remaining.size > 0) {
    const ready = [...remaining].filter((id) =>
      (byId.get(id)?.prerequisites ?? []).every(
        (prerequisite) => (mastery.get(prerequisite) ?? 0) >= 82 || planned.has(prerequisite),
      ),
    );
    const candidates = ready.length > 0 ? ready : [...remaining];
    const scored = candidates.map((id) => {
      const topic = byId.get(id)!;
      const score = mastery.get(id) ?? 0;
      const days = recency.get(id);
      const goalWeight = id === profile.targetId ? 26 : 12;
      const gapWeight = (100 - score) * 0.52;
      const behaviorWeight = days == null ? 12 : Math.min(days, 30) / 30 * 16;
      const sessionFit = topic.durationMinutes <= profile.sessionMinutes ? 8 : 3;
      return { id, topic, score, priority: gapWeight + goalWeight + behaviorWeight + sessionFit, days };
    });
    scored.sort((a, b) => b.priority - a.priority);
    const selected = scored[0];
    const reasons = [
      selected.score < 65 ? `recent check-in shows ${selected.score}% mastery` : `${selected.score}% mastery could use one more review`,
      selected.days == null ? "no practice data yet" : selected.days >= 10 ? `last practiced ${selected.days} days ago` : null,
      selected.id === profile.targetId ? "directly supports your chosen learning goal" : "builds a prerequisite skill for your goal",
    ].filter(Boolean);
    plan.push({ topic: selected.topic, mastery: selected.score, priority: Math.round(selected.priority), reason: reasons.join(" · ") });
    planned.add(selected.id);
    remaining.delete(selected.id);
  }
  return plan;
}
