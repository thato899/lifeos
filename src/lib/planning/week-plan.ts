import { localDateKey } from "./date-utils";
import { planDay, type DayPlan, type UnscheduledTask } from "./day-plan";
import type {
  ScheduleBlockLite,
  SchedulingPreferences,
  TaskLite,
} from "./types";

export interface WeekPlan {
  weekStart: string; // ISO date (Monday, whatever the caller passes)
  days: DayPlan[];
  tasksThatDontFit: UnscheduledTask[];
}

/**
 * LifeOS's week-planning heuristic: runs planDay() once per day of the week
 * in chronological order, removing a task from the pool the moment it gets
 * placed so it isn't double-booked on a later day. Because priority scoring
 * already weighs deadline proximity, a task due Wednesday naturally outranks
 * one due next month and tends to land earlier in the week — there is no
 * separate "which day" heuristic beyond that ranking plus greedy placement.
 */
export function planWeek(params: {
  weekStart: Date;
  tasks: TaskLite[];
  existingSchedule: ScheduleBlockLite[];
  prefs: SchedulingPreferences;
  noScheduleAfterOverride?: string;
  noScheduleBeforeOverride?: string;
  excludeCategories?: string[];
}): WeekPlan {
  const { weekStart, existingSchedule, prefs } = params;
  let remainingTasks = [...params.tasks];
  const days: DayPlan[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);

    const dayPlan = planDay({
      date,
      tasks: remainingTasks,
      existingSchedule,
      prefs,
      noScheduleAfterOverride: params.noScheduleAfterOverride,
      noScheduleBeforeOverride: params.noScheduleBeforeOverride,
      excludeCategories: params.excludeCategories,
    });

    days.push(dayPlan);

    const scheduledIds = new Set(dayPlan.proposedBlocks.map((b) => b.taskId));
    remainingTasks = remainingTasks.filter((t) => !scheduledIds.has(t.id));
  }

  // Whatever never got a slot across all 7 days genuinely doesn't fit the week.
  const scheduledAnywhere = new Set(
    days.flatMap((d) => d.proposedBlocks.map((b) => b.taskId)),
  );
  const tasksThatDontFit = remainingTasks
    .filter((t) => !scheduledAnywhere.has(t.id))
    .map((t) => ({
      taskId: t.id,
      title: t.title,
      reason: "Didn't fit in any day's available time this week.",
    }));

  return {
    weekStart: localDateKey(weekStart),
    days,
    tasksThatDontFit,
  };
}
