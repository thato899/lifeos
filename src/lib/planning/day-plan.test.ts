import { describe, expect, it } from "vitest";
import { planDay } from "./day-plan";
import type { SchedulingPreferences, TaskLite } from "./types";

const prefs: SchedulingPreferences = {
  timezone: "UTC",
  workingHoursStart: "09:00",
  workingHoursEnd: "17:00",
  noScheduleAfter: "19:00",
};

function task(overrides: Partial<TaskLite>): TaskLite {
  return {
    id: "t",
    title: "Task",
    priority: "medium",
    status: "inbox",
    dueDate: null,
    estimatedMinutes: 60,
    ...overrides,
  };
}

describe("planDay", () => {
  it("schedules the highest-priority task first, into the earliest free slot", () => {
    const date = new Date("2026-08-31T00:00:00");
    const plan = planDay({
      date,
      tasks: [
        task({ id: "low", priority: "low" }),
        task({ id: "urgent", priority: "urgent" }),
      ],
      existingSchedule: [],
      prefs,
    });
    expect(plan.proposedBlocks[0].taskId).toBe("urgent");
  });

  it("respects a hard noScheduleAfter override", () => {
    const date = new Date("2026-08-31T00:00:00");
    const plan = planDay({
      date,
      tasks: [task({ id: "t1", estimatedMinutes: 600 })],
      existingSchedule: [],
      prefs,
      noScheduleAfterOverride: "19:00",
    });
    for (const block of plan.proposedBlocks) {
      expect(block.end.getHours()).toBeLessThanOrEqual(19);
    }
  });

  it("does not double-book an already-busy slot", () => {
    const date = new Date("2026-08-31T00:00:00");
    const plan = planDay({
      date,
      tasks: [task({ id: "t1", estimatedMinutes: 480 })], // whole working day
      existingSchedule: [
        {
          id: "busy",
          title: "Meeting",
          start: new Date("2026-08-31T10:00:00"),
          end: new Date("2026-08-31T11:00:00"),
        },
      ],
      prefs,
    });
    for (const block of plan.proposedBlocks) {
      const overlapsBusy =
        block.start < new Date("2026-08-31T11:00:00") &&
        block.end > new Date("2026-08-31T10:00:00");
      expect(overlapsBusy).toBe(false);
    }
  });

  it("marks a task unscheduled when it exceeds the available minutes budget", () => {
    const date = new Date("2026-08-31T00:00:00");
    const plan = planDay({
      date,
      tasks: [task({ id: "big", estimatedMinutes: 120 })],
      existingSchedule: [],
      prefs,
      availableMinutes: 30,
    });
    expect(plan.unscheduledTasks.map((u) => u.taskId)).toContain("big");
  });

  it("excludes tasks in an excluded category", () => {
    const date = new Date("2026-08-31T00:00:00");
    const plan = planDay({
      date,
      tasks: [task({ id: "shopping", category: "errands" })],
      existingSchedule: [],
      prefs,
      excludeCategories: ["errands"],
    });
    expect(plan.proposedBlocks).toHaveLength(0);
    expect(plan.unscheduledTasks).toHaveLength(0); // filtered out entirely, not "couldn't fit"
  });
});
