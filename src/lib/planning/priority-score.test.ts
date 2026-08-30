import { describe, expect, it } from "vitest";
import { prioritizeTasks, scoreTask } from "./priority-score";
import type { TaskLite } from "./types";

const NOW = new Date("2026-08-30T09:00:00Z");

function task(overrides: Partial<TaskLite>): TaskLite {
  return {
    id: "t1",
    title: "Task",
    priority: "medium",
    status: "inbox",
    dueDate: null,
    estimatedMinutes: null,
    ...overrides,
  };
}

describe("scoreTask", () => {
  it("scores an overdue urgent task higher than a far-future low-priority task", () => {
    const overdue = scoreTask(
      task({ priority: "urgent", dueDate: new Date("2026-08-25T00:00:00Z") }),
      NOW,
    );
    const distant = scoreTask(
      task({ priority: "low", dueDate: new Date("2026-12-01T00:00:00Z") }),
      NOW,
    );
    expect(overdue.score).toBeGreaterThan(distant.score);
    expect(overdue.isOverdue).toBe(true);
  });

  it("scores a task due today higher than one due next week, same priority", () => {
    const dueToday = scoreTask(
      task({ priority: "high", dueDate: new Date("2026-08-30T00:00:00Z") }),
      NOW,
    );
    const dueLater = scoreTask(
      task({ priority: "high", dueDate: new Date("2026-09-06T00:00:00Z") }),
      NOW,
    );
    expect(dueToday.score).toBeGreaterThan(dueLater.score);
  });

  it("applies an effort penalty that reduces the score for longer tasks", () => {
    const quick = scoreTask(task({ estimatedMinutes: 15 }), NOW);
    const long = scoreTask(task({ estimatedMinutes: 240 }), NOW);
    expect(quick.score).toBeGreaterThan(long.score);
  });

  it("gives a task with no due date zero urgency/deadline weight", () => {
    const result = scoreTask(task({}), NOW);
    expect(result.urgencyWeight).toBe(0);
    expect(result.deadlineWeight).toBe(0);
    expect(result.isOverdue).toBe(false);
  });
});

describe("prioritizeTasks", () => {
  it("excludes completed and archived tasks", () => {
    const tasks = [
      task({ id: "a", status: "completed" }),
      task({ id: "b", status: "archived" }),
      task({ id: "c", status: "inbox" }),
    ];
    const ranked = prioritizeTasks(tasks, NOW);
    expect(ranked.map((r) => r.task.id)).toEqual(["c"]);
  });

  it("sorts highest score first", () => {
    const tasks = [
      task({ id: "low", priority: "low" }),
      task({
        id: "urgent",
        priority: "urgent",
        dueDate: new Date("2026-08-25T00:00:00Z"),
      }),
    ];
    const ranked = prioritizeTasks(tasks, NOW);
    expect(ranked[0].task.id).toBe("urgent");
  });
});
