import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { executeTool } from "@/webmcp/execute";
import { createTestUser, deleteTestUser } from "../helpers";

describe("executeTool", () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser("exec");
    userId = user.id;
  });

  afterEach(async () => {
    await deleteTestUser(userId);
  });

  it("returns TOOL_NOT_FOUND for an unregistered tool name", async () => {
    const { result } = await executeTool(userId, "delete_everything", {});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("TOOL_NOT_FOUND");
  });

  it("returns a validation error instead of throwing when required input is missing", async () => {
    const { result } = await executeTool(userId, "create_task", {
      priority: "high",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("executes a read tool directly and logs an AGENT_ACTION activity event", async () => {
    const { result } = await executeTool(userId, "get_today_overview", {});
    expect(result.success).toBe(true);

    const events = await db.activityEvent.findMany({ where: { userId } });
    expect(
      events.some(
        (e) => e.type === "AGENT_ACTION" && e.toolName === "get_today_overview",
      ),
    ).toBe(true);
  });

  it("executes a low-impact write tool directly and persists the mutation", async () => {
    const { result } = await executeTool(userId, "create_task", {
      title: "Buy groceries",
      priority: "medium",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;

    const task = result.data as { id: string; title: string };
    const found = await db.task.findUnique({ where: { id: task.id } });
    expect(found?.title).toBe("Buy groceries");
    expect(found?.userId).toBe(userId);

    const events = await db.activityEvent.findMany({
      where: { userId, type: "TASK_CREATED" },
    });
    expect(events).toHaveLength(1);
  });

  it("does NOT delete a task on a high-impact call — it creates a pending approval instead", async () => {
    const created = await db.task.create({
      data: { userId, title: "Old task" },
    });

    const { result } = await executeTool(userId, "delete_task", {
      taskId: created.id,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(
      (result.data as { approvalRequired: boolean }).approvalRequired,
    ).toBe(true);

    const stillThere = await db.task.findUnique({ where: { id: created.id } });
    expect(stillThere).not.toBeNull();

    const approvals = await db.approvalRequest.findMany({
      where: { userId, actionType: "delete_task" },
    });
    expect(approvals).toHaveLength(1);
    expect(approvals[0].status).toBe("pending");
  });

  it("only deletes the task after the approval is granted", async () => {
    const created = await db.task.create({
      data: { userId, title: "To be deleted" },
    });
    const { result } = await executeTool(userId, "delete_task", {
      taskId: created.id,
    });
    if (!result.success) throw new Error("expected approval to be created");
    const { approvalId } = result.data as { approvalId: string };

    const { approveRequest } = await import("@/services/approval.service");
    const { getTool } = await import("@/webmcp/registry");
    await approveRequest(userId, approvalId, "human", getTool);

    const afterApproval = await db.task.findUnique({
      where: { id: created.id },
    });
    expect(afterApproval).toBeNull();

    const approval = await db.approvalRequest.findUnique({
      where: { id: approvalId },
    });
    expect(approval?.status).toBe("approved");
  });

  it("never returns another user's task through get_task", async () => {
    const otherUser = await createTestUser("victim");
    const otherTask = await db.task.create({
      data: { userId: otherUser.id, title: "Not yours" },
    });

    const { result } = await executeTool(userId, "get_task", {
      taskId: otherTask.id,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("TASK_NOT_FOUND");

    await deleteTestUser(otherUser.id);
  });

  it("does not execute delete_task's approval payload as arbitrary code even if the taskId is forged", async () => {
    // The payload stored on the ApprovalRequest is re-validated against the
    // tool's zod schema at approval time (see registry.ts), not trusted
    // blindly, so tampering with it can only ever produce another
    // schema-shaped call — never something outside create_task's contract.
    const { createApprovalRequest, approveRequest } =
      await import("@/services/approval.service");
    const { getTool } = await import("@/webmcp/registry");
    const approval = await createApprovalRequest({
      userId,
      actionType: "delete_task",
      summary: "test",
      payload: {
        taskId: "does-not-exist",
        extraField: "() => process.exit(1)",
      },
    });

    await expect(
      approveRequest(userId, approval.id, "human", getTool),
    ).rejects.toThrow();
  });

  it("resolves the tool via the injected resolver, not an import-time side effect", async () => {
    // Regression test for a real bug: approval resolution used to rely on a
    // module-level registration loop running as an import side effect
    // (src/webmcp/registry.ts). That worked by accident in this test file
    // because it also imports the registry via executeTool — but broke for
    // real in the app, where the "Approve" server action's module graph
    // never touched that file. Simulate the broken case directly: a
    // resolver that legitimately has no tool registered should surface
    // NO_EXECUTOR, not silently do nothing or crash differently.
    const { createApprovalRequest, approveRequest } =
      await import("@/services/approval.service");
    const approval = await createApprovalRequest({
      userId,
      actionType: "delete_task",
      summary: "test",
      payload: { taskId: "irrelevant" },
    });

    await expect(
      approveRequest(userId, approval.id, "human", () => undefined),
    ).rejects.toThrow(/no handler registered/i);
  });
});
