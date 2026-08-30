import { describe, expect, it } from "vitest";
import { identifyConflicts, summarizeWorkload } from "./conflicts";
import type {
  ScheduleBlockLite,
  SchedulingPreferences,
  TaskLite,
} from "./types";

const prefs: SchedulingPreferences = {
  timezone: "UTC",
  workingHoursStart: "09:00",
  workingHoursEnd: "17:00",
  noScheduleAfter: "19:00",
};

function block(overrides: Partial<ScheduleBlockLite>): ScheduleBlockLite {
  return {
    id: "b1",
    title: "Block",
    start: new Date("2026-08-31T10:00:00"),
    end: new Date("2026-08-31T11:00:00"),
    ...overrides,
  };
}

describe("identifyConflicts", () => {
  it("flags overlapping schedule blocks", () => {
    const a = block({
      id: "a",
      start: new Date("2026-08-31T10:00:00"),
      end: new Date("2026-08-31T11:00:00"),
    });
    const b = block({
      id: "b",
      start: new Date("2026-08-31T10:30:00"),
      end: new Date("2026-08-31T11:30:00"),
    });
    const conflicts = identifyConflicts([a, b], [], prefs);
    expect(conflicts.some((c) => c.type === "overlap")).toBe(true);
  });

  it("does not flag adjacent (non-overlapping) blocks", () => {
    const a = block({
      id: "a",
      start: new Date("2026-08-31T10:00:00"),
      end: new Date("2026-08-31T11:00:00"),
    });
    const b = block({
      id: "b",
      start: new Date("2026-08-31T11:00:00"),
      end: new Date("2026-08-31T12:00:00"),
    });
    const conflicts = identifyConflicts([a, b], [], prefs);
    expect(conflicts.some((c) => c.type === "overlap")).toBe(false);
  });

  it("flags a block scheduled after noScheduleAfter", () => {
    const late = block({
      start: new Date("2026-08-31T19:30:00"),
      end: new Date("2026-08-31T20:30:00"),
    });
    const conflicts = identifyConflicts([late], [], prefs);
    expect(conflicts.some((c) => c.type === "outside_availability")).toBe(true);
  });

  it("flags two urgent/high tasks due the same day as a deadline clash", () => {
    const tasks: TaskLite[] = [
      {
        id: "1",
        title: "A",
        priority: "urgent",
        status: "planned",
        dueDate: new Date("2026-09-01"),
        estimatedMinutes: null,
      },
      {
        id: "2",
        title: "B",
        priority: "high",
        status: "planned",
        dueDate: new Date("2026-09-01"),
        estimatedMinutes: null,
      },
    ];
    const conflicts = identifyConflicts([], tasks, prefs);
    expect(conflicts.some((c) => c.type === "deadline_clash")).toBe(true);
  });

  it("flags an overloaded day when scheduled minutes exceed capacity", () => {
    // Capacity with these prefs is (19:00 - 09:00) - 30min buffer = 570 min.
    // 10 back-to-back one-hour blocks (600 min, ending exactly at the
    // noScheduleAfter boundary) exceeds that without also triggering an
    // "outside availability" conflict.
    const blocks: ScheduleBlockLite[] = Array.from({ length: 10 }, (_, i) =>
      block({
        id: `b${i}`,
        start: new Date(`2026-08-31T${String(9 + i).padStart(2, "0")}:00:00`),
        end: new Date(`2026-08-31T${String(10 + i).padStart(2, "0")}:00:00`),
      }),
    );
    const conflicts = identifyConflicts(blocks, [], prefs);
    expect(conflicts.some((c) => c.type === "overloaded_day")).toBe(true);
  });
});

describe("summarizeWorkload", () => {
  it("separates overdue from due-today tasks", () => {
    const now = new Date("2026-08-30T09:00:00Z");
    const tasks: TaskLite[] = [
      {
        id: "1",
        title: "Overdue",
        priority: "high",
        status: "planned",
        dueDate: new Date("2026-08-20"),
        estimatedMinutes: 30,
      },
      {
        id: "2",
        title: "Today",
        priority: "medium",
        status: "planned",
        dueDate: new Date("2026-08-30"),
        estimatedMinutes: 30,
      },
      {
        id: "3",
        title: "Done",
        priority: "low",
        status: "completed",
        dueDate: new Date("2026-08-01"),
        estimatedMinutes: 30,
      },
    ];
    const summary = summarizeWorkload(tasks, now);
    expect(summary.overdueTasks.map((t) => t.id)).toEqual(["1"]);
    expect(summary.dueTodayTasks.map((t) => t.id)).toEqual(["2"]);
    expect(summary.totalTasks).toBe(2); // completed task excluded
  });
});
