import type { PriorityLevel, TaskLite } from "./types";

/**
 * LifeOS's planning heuristic — NOT a scientifically validated productivity
 * algorithm. It is a transparent, explainable score used to rank tasks and
 * decide what the planner schedules first. Every weight below is a plain
 * constant so the reasoning is inspectable (see prioritizeTasks(), which
 * returns the breakdown alongside the score for exactly this reason).
 *
 *   priorityScore = urgencyWeight + importanceWeight + deadlineWeight - effortPenalty
 */

const IMPORTANCE_BY_PRIORITY: Record<PriorityLevel, number> = {
  low: 5,
  medium: 10,
  high: 18,
  urgent: 25,
};

export interface PriorityScoreBreakdown {
  score: number;
  urgencyWeight: number;
  importanceWeight: number;
  deadlineWeight: number;
  effortPenalty: number;
  daysUntilDue: number | null;
  isOverdue: boolean;
}

export function daysUntil(date: Date, now: Date = new Date()): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round(
    (startOfDay(date).getTime() - startOfDay(now).getTime()) / msPerDay,
  );
}

export function scoreTask(
  task: TaskLite,
  now: Date = new Date(),
): PriorityScoreBreakdown {
  const importanceWeight = IMPORTANCE_BY_PRIORITY[task.priority];

  let urgencyWeight = 0;
  let deadlineWeight = 0;
  let daysUntilDue: number | null = null;
  let isOverdue = false;

  if (task.dueDate) {
    daysUntilDue = daysUntil(task.dueDate, now);
    isOverdue = daysUntilDue < 0 && task.status !== "completed";

    if (isOverdue) {
      // The longer overdue, the more it dominates the score, capped so one
      // ancient task can't permanently bury everything else.
      urgencyWeight = Math.min(40, 25 + Math.abs(daysUntilDue) * 2);
      deadlineWeight = 20;
    } else {
      urgencyWeight = daysUntilDue === 0 ? 15 : daysUntilDue === 1 ? 8 : 0;
      deadlineWeight = Math.max(0, 20 - daysUntilDue * 2);
    }
  }

  if (task.status === "in_progress") {
    // A small nudge to finish what's already started over starting new work.
    urgencyWeight += 4;
  }

  const effortMinutes = task.estimatedMinutes ?? 30;
  const effortPenalty = Math.min(20, effortMinutes / 10);

  const score =
    urgencyWeight + importanceWeight + deadlineWeight - effortPenalty;

  return {
    score: Math.round(score * 10) / 10,
    urgencyWeight,
    importanceWeight,
    deadlineWeight,
    effortPenalty: Math.round(effortPenalty * 10) / 10,
    daysUntilDue,
    isOverdue,
  };
}

export interface RankedTask {
  task: TaskLite;
  breakdown: PriorityScoreBreakdown;
  explanation: string;
}

export function explainScore(
  task: TaskLite,
  breakdown: PriorityScoreBreakdown,
): string {
  const parts: string[] = [];
  if (breakdown.isOverdue) {
    parts.push(`overdue by ${Math.abs(breakdown.daysUntilDue ?? 0)} day(s)`);
  } else if (breakdown.daysUntilDue === 0) {
    parts.push("due today");
  } else if (breakdown.daysUntilDue === 1) {
    parts.push("due tomorrow");
  } else if (breakdown.daysUntilDue !== null) {
    parts.push(`due in ${breakdown.daysUntilDue} day(s)`);
  }
  parts.push(`${task.priority} priority`);
  if (task.estimatedMinutes) {
    parts.push(`~${task.estimatedMinutes} min`);
  }
  return parts.join(", ");
}

/** Ranks tasks highest-score-first, excluding completed/archived tasks. */
export function prioritizeTasks(
  tasks: TaskLite[],
  now: Date = new Date(),
): RankedTask[] {
  return tasks
    .filter((t) => t.status !== "completed" && t.status !== "archived")
    .map((task) => {
      const breakdown = scoreTask(task, now);
      return { task, breakdown, explanation: explainScore(task, breakdown) };
    })
    .sort((a, b) => b.breakdown.score - a.breakdown.score);
}
