// Lightweight, ORM-independent shapes for the planning engine. Kept separate
// from the Prisma-generated types so these pure functions stay trivially
// unit-testable and don't couple business logic to the database schema.

export type PriorityLevel = "low" | "medium" | "high" | "urgent";
export type TaskStatusValue =
  "inbox" | "planned" | "in_progress" | "completed" | "archived";

export interface TaskLite {
  id: string;
  title: string;
  priority: PriorityLevel;
  status: TaskStatusValue;
  dueDate: Date | null;
  estimatedMinutes: number | null;
  category?: string | null;
}

export interface ScheduleBlockLite {
  id: string;
  title: string;
  start: Date;
  end: Date;
  taskId?: string | null;
  category?: string | null;
}

export interface UnavailablePeriod {
  label: string;
  dayOfWeek?: number; // 0-6, recurring weekly
  date?: string; // ISO date, one-off
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

export interface SchedulingPreferences {
  timezone: string;
  workingHoursStart: string; // "HH:mm"
  workingHoursEnd: string; // "HH:mm"
  noScheduleAfter?: string | null; // "HH:mm"
  unavailablePeriods?: UnavailablePeriod[];
}
