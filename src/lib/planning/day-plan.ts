import { localDateKey } from "./date-utils";
import { prioritizeTasks } from "./priority-score";
import type {
  ScheduleBlockLite,
  SchedulingPreferences,
  TaskLite,
} from "./types";

export interface ProposedBlock {
  taskId: string;
  title: string;
  start: Date;
  end: Date;
  estimatedMinutes: number;
}

export interface UnscheduledTask {
  taskId: string;
  title: string;
  reason: string;
}

export interface DayPlan {
  date: string; // ISO date
  proposedBlocks: ProposedBlock[];
  unscheduledTasks: UnscheduledTask[];
  freeMinutesRemaining: number;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function atMinuteOfDay(date: Date, minutes: number): Date {
  const d = new Date(date);
  d.setHours(0, minutes, 0, 0);
  return d;
}

interface Interval {
  start: number; // minutes since midnight
  end: number;
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [sorted[0]];
  for (const cur of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

function freeIntervalsWithin(window: Interval, busy: Interval[]): Interval[] {
  const merged = mergeIntervals(
    busy.filter((b) => b.end > window.start && b.start < window.end),
  );
  const free: Interval[] = [];
  let cursor = window.start;
  for (const b of merged) {
    const clampedStart = Math.max(b.start, window.start);
    const clampedEnd = Math.min(b.end, window.end);
    if (clampedStart > cursor) free.push({ start: cursor, end: clampedStart });
    cursor = Math.max(cursor, clampedEnd);
  }
  if (cursor < window.end) free.push({ start: cursor, end: window.end });
  return free;
}

/**
 * LifeOS's day-planning heuristic: takes the day's working-hours window
 * (minus anything already on the calendar and minus noScheduleAfter),
 * ranks open tasks by the priority-score heuristic, and greedily places the
 * highest-ranked tasks into the earliest free slot that fits. It is a
 * transparent bin-packing pass, not an optimizer — ties and edge cases
 * favor predictability over cleverness so a human can always see why a
 * task landed where it did.
 */
export function planDay(params: {
  date: Date;
  tasks: TaskLite[];
  existingSchedule: ScheduleBlockLite[];
  prefs: SchedulingPreferences;
  availableMinutes?: number;
  noScheduleAfterOverride?: string;
  noScheduleBeforeOverride?: string;
  excludeCategories?: string[];
}): DayPlan {
  const {
    date,
    tasks,
    existingSchedule,
    prefs,
    availableMinutes,
    noScheduleAfterOverride,
    noScheduleBeforeOverride,
    excludeCategories = [],
  } = params;

  const dayWindowStart = toMinutes(
    noScheduleBeforeOverride ?? prefs.workingHoursStart,
  );
  const hardStop = toMinutes(
    noScheduleAfterOverride ?? prefs.noScheduleAfter ?? prefs.workingHoursEnd,
  );

  const dayKey = localDateKey(date);
  const busy: Interval[] = existingSchedule
    .filter((b) => localDateKey(b.start) === dayKey)
    .map((b) => ({
      start: b.start.getHours() * 60 + b.start.getMinutes(),
      end: b.end.getHours() * 60 + b.end.getMinutes(),
    }));

  const free = freeIntervalsWithin(
    { start: dayWindowStart, end: hardStop },
    busy,
  );
  const totalFreeMinutes = free.reduce((sum, i) => sum + (i.end - i.start), 0);
  let minutesBudget = availableMinutes ?? totalFreeMinutes;

  const eligible = tasks.filter(
    (t) =>
      (t.status === "inbox" ||
        t.status === "planned" ||
        t.status === "in_progress") &&
      !(t.category && excludeCategories.includes(t.category)),
  );
  const ranked = prioritizeTasks(eligible);

  const proposedBlocks: ProposedBlock[] = [];
  const unscheduledTasks: UnscheduledTask[] = [];

  for (const { task } of ranked) {
    const duration = task.estimatedMinutes ?? 30;
    if (duration > minutesBudget) {
      unscheduledTasks.push({
        taskId: task.id,
        title: task.title,
        reason: "Not enough available time left today.",
      });
      continue;
    }

    const slotIndex = free.findIndex((f) => f.end - f.start >= duration);
    if (slotIndex === -1) {
      unscheduledTasks.push({
        taskId: task.id,
        title: task.title,
        reason: "No single free slot is long enough for this task.",
      });
      continue;
    }

    const slot = free[slotIndex];
    const blockStart = slot.start;
    const blockEnd = slot.start + duration;

    proposedBlocks.push({
      taskId: task.id,
      title: task.title,
      start: atMinuteOfDay(date, blockStart),
      end: atMinuteOfDay(date, blockEnd),
      estimatedMinutes: duration,
    });

    minutesBudget -= duration;
    if (blockEnd >= slot.end) {
      free.splice(slotIndex, 1);
    } else {
      free[slotIndex] = { start: blockEnd, end: slot.end };
    }
  }

  return {
    date: dayKey,
    proposedBlocks,
    unscheduledTasks,
    freeMinutesRemaining: Math.max(0, minutesBudget),
  };
}
