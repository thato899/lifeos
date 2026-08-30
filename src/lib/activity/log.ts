import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type EventType =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_COMPLETED"
  | "TASK_REOPENED"
  | "TASK_DELETED"
  | "SCHEDULE_CREATED"
  | "SCHEDULE_UPDATED"
  | "SCHEDULE_DELETED"
  | "GOAL_CREATED"
  | "GOAL_UPDATED"
  | "GOAL_DELETED"
  | "EXPENSE_CREATED"
  | "EXPENSE_UPDATED"
  | "EXPENSE_DELETED"
  | "SHOPPING_LIST_CREATED"
  | "SHOPPING_ITEM_ADDED"
  | "SHOPPING_ITEM_UPDATED"
  | "SHOPPING_ITEM_REMOVED"
  | "ROUTINE_CREATED"
  | "ROUTINE_UPDATED"
  | "ROUTINE_DELETED"
  | "AGENT_ACTION"
  | "APPROVAL_REQUESTED"
  | "APPROVAL_GRANTED"
  | "APPROVAL_REJECTED";

export type Actor = "human" | "agent" | "system";

export interface LogActivityInput {
  userId: string;
  type: EventType;
  actor: Actor;
  summary: string;
  toolName?: string;
  metadata?: Prisma.InputJsonValue;
  requiresApproval?: boolean;
  approvalRequestId?: string;
}

/**
 * The single write path for the ActivityEvent table. Every service-layer
 * mutation — whether triggered by a human clicking a button or an agent
 * invoking a WebMCP tool — calls this so the Agent Activity panel and the
 * WebMCP tool inspector have one consistent, complete feed to read from.
 * See docs/webmcp.md "Agent activity log".
 */
export async function logActivity(input: LogActivityInput) {
  return db.activityEvent.create({
    data: {
      userId: input.userId,
      type: input.type,
      actor: input.actor,
      summary: input.summary,
      toolName: input.toolName,
      metadata: input.metadata,
      requiresApproval: input.requiresApproval ?? false,
      approvalRequestId: input.approvalRequestId,
    },
  });
}

export async function listRecentActivity(userId: string, limit = 30) {
  return db.activityEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { approvalRequest: true },
  });
}
