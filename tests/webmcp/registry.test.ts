import { describe, expect, it } from "vitest";
import { ALL_TOOLS } from "@/webmcp/registry";
import { getPublicToolMetadata } from "@/webmcp/public-tools";

describe("WebMCP tool registry", () => {
  it("has no duplicate tool names", () => {
    const names = ALL_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("uses snake_case names an agent can call verbatim", () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("gives every tool a non-trivial description that says when to use it", () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.description.length).toBeGreaterThan(30);
      expect(tool.title.length).toBeGreaterThan(0);
    }
  });

  it("declares every required expected tool from the spec's minimum tool list", () => {
    const expected = [
      "get_today_overview",
      "get_tasks",
      "get_task",
      "get_schedule",
      "get_goals",
      "get_shopping_list",
      "get_expenses",
      "get_routines",
      "create_task",
      "update_task",
      "complete_task",
      "delete_task",
      "create_schedule_block",
      "reschedule_task",
      "create_goal",
      "update_goal_progress",
      "create_shopping_list",
      "add_shopping_item",
      "remove_shopping_item",
      "record_expense",
      "create_routine",
      "analyze_day",
      "plan_my_day",
      "plan_my_week",
      "identify_conflicts",
      "prioritize_tasks",
      "analyze_spending",
      "create_action_plan",
    ];
    const names = new Set(ALL_TOOLS.map((t) => t.name));
    for (const name of expected) {
      expect(names.has(name), `missing tool: ${name}`).toBe(true);
    }
  });

  it("never classifies a mutating-verb-named tool as read", () => {
    const writeVerbs = [
      "create_",
      "update_",
      "delete_",
      "add_",
      "remove_",
      "complete_",
      "reopen_",
      "record_",
      "apply_",
      "set_",
    ];
    for (const tool of ALL_TOOLS.filter((t) => t.riskLevel === "read")) {
      expect(writeVerbs.some((verb) => tool.name.startsWith(verb))).toBe(false);
    }
  });

  it("classifies destructive/irreversible/financial-target tools as high_write", () => {
    const highWrite = new Set(
      ALL_TOOLS.filter((t) => t.riskLevel === "high_write").map((t) => t.name),
    );
    expect(highWrite.has("delete_task")).toBe(true);
    expect(highWrite.has("apply_schedule_plan")).toBe(true);
    expect(highWrite.has("set_budget")).toBe(true);
  });
});

describe("getPublicToolMetadata", () => {
  it("produces valid JSON Schema objects for every tool without throwing", () => {
    const metadata = getPublicToolMetadata();
    expect(metadata.length).toBe(ALL_TOOLS.length);
    for (const tool of metadata) {
      expect(tool.inputSchema).toHaveProperty("type", "object");
    }
  });

  it("never leaks an execute function to the client payload", () => {
    const metadata = getPublicToolMetadata();
    for (const tool of metadata) {
      expect(tool).not.toHaveProperty("execute");
    }
  });

  it("sets readOnlyHint only for read tools and untrustedContentHint for tools returning user text", () => {
    const metadata = getPublicToolMetadata();
    const getTasks = metadata.find((t) => t.name === "get_tasks")!;
    expect(getTasks.annotations.readOnlyHint).toBe(true);
    expect(getTasks.annotations.untrustedContentHint).toBe(true);

    const deleteTask = metadata.find((t) => t.name === "delete_task")!;
    expect(deleteTask.annotations.readOnlyHint).toBe(false);
  });
});
