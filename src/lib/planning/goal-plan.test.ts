import { describe, expect, it } from "vitest";
import { generateActionPlan } from "./goal-plan";

describe("generateActionPlan", () => {
  it("turns incomplete milestones directly into suggested tasks", () => {
    const goal = {
      id: "g1",
      title: "Launch website",
      category: null,
      targetDate: null,
    };
    const milestones = [
      {
        id: "m1",
        title: "Design homepage",
        targetDate: null,
        completed: false,
      },
      { id: "m2", title: "Deploy", targetDate: null, completed: true },
    ];
    const plan = generateActionPlan(goal, milestones);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({
      title: "Design homepage",
      source: "milestone",
    });
  });

  it("matches a template by keyword when there are no milestones", () => {
    const goal = {
      id: "g1",
      title: "Save R20,000 by December",
      category: "finance",
      targetDate: null,
    };
    const plan = generateActionPlan(goal, []);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.every((t) => t.source === "template")).toBe(true);
    expect(plan.some((t) => /savings/i.test(t.title))).toBe(true);
  });

  it("falls back to the generic decomposition when nothing matches", () => {
    const goal = {
      id: "g1",
      title: "Become more mindful",
      category: null,
      targetDate: null,
    };
    const plan = generateActionPlan(goal, []);
    expect(plan[0].title).toMatch(/define exactly what done looks like/i);
  });
});
