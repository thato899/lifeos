import type {
  ScheduleBlockLite,
  SchedulingPreferences,
  TaskLite,
} from "./types";
import { localDateKey } from "./date-utils";
import { daysUntil } from "./priority-score";

export type ConflictType =
  "overlap" | "outside_availability" | "overloaded_day" | "deadline_clash";

export interface Conflict {
  type: ConflictType;
  description: string;
  relatedScheduleBlockIds?: string[];
  relatedTaskIds?: string[];
  date?: string; // ISO date, when the conflict is day-scoped
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function blockMinutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** True when a schedule block falls outside working hours or a noScheduleAfter boundary. */
function isOutsideAvailability(
  block: ScheduleBlockLite,
  prefs: SchedulingPreferences,
): boolean {
  const startMin = blockMinutesOfDay(block.start);
  const endMin =
    block.end.getDate() === block.start.getDate()
      ? blockMinutesOfDay(block.end)
      : 24 * 60; // spans past midnight — treat rest of day as "outside" for simplicity

  const workStart = toMinutes(prefs.workingHoursStart);
  const workEnd = toMinutes(prefs.workingHoursEnd);
  const hardStop = prefs.noScheduleAfter
    ? toMinutes(prefs.noScheduleAfter)
    : workEnd;

  return startMin < workStart || endMin > hardStop;
}

function overlaps(a: ScheduleBlockLite, b: ScheduleBlockLite): boolean {
  return a.start < b.end && b.start < a.end;
}

const DAY_CAPACITY_BUFFER_MINUTES = 30; // leave breathing room, don't pack every minute

/**
 * LifeOS's conflict-detection heuristic. Flags (a) overlapping schedule
 * blocks, (b) blocks placed outside working hours / past noScheduleAfter,
 * (c) days where scheduled + due workload exceeds available working time,
 * and (d) days with more than one urgent/high-priority deadline landing at
 * once. This informs plan_my_day / plan_my_week and the identify_conflicts
 * WebMCP tool — it is not a constraint solver, just transparent flagging.
 */
export function identifyConflicts(
  schedule: ScheduleBlockLite[],
  tasks: TaskLite[],
  prefs: SchedulingPreferences,
): Conflict[] {
  const conflicts: Conflict[] = [];

  // (a) overlapping schedule blocks
  const sorted = [...schedule].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].start >= sorted[i].end) break; // sorted by start; no later block can overlap
      if (overlaps(sorted[i], sorted[j])) {
        conflicts.push({
          type: "overlap",
          description: `"${sorted[i].title}" overlaps with "${sorted[j].title}".`,
          relatedScheduleBlockIds: [sorted[i].id, sorted[j].id],
        });
      }
    }
  }

  // (b) outside availability
  for (const block of schedule) {
    if (isOutsideAvailability(block, prefs)) {
      conflicts.push({
        type: "outside_availability",
        description: `"${block.title}" is scheduled outside your available hours.`,
        relatedScheduleBlockIds: [block.id],
      });
    }
  }

  // (c) overloaded days — scheduled minutes vs. working-hours capacity, per day
  const workStart = toMinutes(prefs.workingHoursStart);
  const workEnd = toMinutes(prefs.workingHoursEnd);
  const hardStop = prefs.noScheduleAfter
    ? toMinutes(prefs.noScheduleAfter)
    : workEnd;
  const capacityMinutes = Math.max(
    0,
    hardStop - workStart - DAY_CAPACITY_BUFFER_MINUTES,
  );

  const minutesByDay = new Map<string, number>();
  for (const block of schedule) {
    const key = localDateKey(block.start);
    const minutes = (block.end.getTime() - block.start.getTime()) / 60_000;
    minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + minutes);
  }
  for (const [date, minutes] of minutesByDay) {
    if (minutes > capacityMinutes) {
      conflicts.push({
        type: "overloaded_day",
        description: `${date} has ${Math.round(minutes)} minutes scheduled against roughly ${capacityMinutes} available — that day is overbooked.`,
        date,
      });
    }
  }

  // (d) deadline clashes — 2+ high/urgent tasks due the same day
  const highPriorityByDay = new Map<string, TaskLite[]>();
  for (const task of tasks) {
    if (!task.dueDate) continue;
    if (task.priority !== "high" && task.priority !== "urgent") continue;
    if (task.status === "completed" || task.status === "archived") continue;
    const key = localDateKey(task.dueDate);
    const list = highPriorityByDay.get(key) ?? [];
    list.push(task);
    highPriorityByDay.set(key, list);
  }
  for (const [date, dayTasks] of highPriorityByDay) {
    if (dayTasks.length > 1) {
      conflicts.push({
        type: "deadline_clash",
        description: `${dayTasks.length} high-priority tasks are due on ${date}: ${dayTasks.map((t) => `"${t.title}"`).join(", ")}.`,
        relatedTaskIds: dayTasks.map((t) => t.id),
        date,
      });
    }
  }

  return conflicts;
}

export interface WorkloadSummary {
  totalTasks: number;
  overdueTasks: TaskLite[];
  dueTodayTasks: TaskLite[];
  totalEstimatedMinutes: number;
}

export function summarizeWorkload(
  tasks: TaskLite[],
  now: Date = new Date(),
): WorkloadSummary {
  const active = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "archived",
  );
  const overdueTasks = active.filter(
    (t) => t.dueDate && daysUntil(t.dueDate, now) < 0,
  );
  const dueTodayTasks = active.filter(
    (t) => t.dueDate && daysUntil(t.dueDate, now) === 0,
  );
  const totalEstimatedMinutes = active.reduce(
    (sum, t) => sum + (t.estimatedMinutes ?? 0),
    0,
  );

  return {
    totalTasks: active.length,
    overdueTasks,
    dueTodayTasks,
    totalEstimatedMinutes,
  };
}
