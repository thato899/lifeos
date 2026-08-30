import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import { AppError } from "@/lib/errors/app-error";

/**
 * Backs the human-in-the-loop control system (spec section 16). A
 * high-impact WebMCP tool never mutates data directly — it calls
 * createApprovalRequest() and returns { approvalRequired: true, ... } to the
 * agent instead. The human sees the pending request in the Agent Activity
 * panel / approval inbox and explicitly approves or rejects it; only then
 * does resolveApproval() invoke the real tool executor. This is the one
 * place an agent action can turn into a database write after the fact, and
 * it always re-validates ownership before doing so.
 */

export async function createApprovalRequest(params: {
  userId: string;
  actionType: string;
  summary: string;
  payload: Prisma.InputJsonValue;
}) {
  const approval = await db.approvalRequest.create({
    data: {
      userId: params.userId,
      actionType: params.actionType,
      summary: params.summary,
      payload: params.payload,
    },
  });

  await logActivity({
    userId: params.userId,
    type: "APPROVAL_REQUESTED",
    actor: "agent",
    summary: params.summary,
    toolName: params.actionType,
    requiresApproval: true,
    approvalRequestId: approval.id,
  });

  return approval;
}

export async function listApprovals(
  userId: string,
  status?: "pending" | "approved" | "rejected" | "expired",
) {
  return db.approvalRequest.findMany({
    where: { userId, status },
    orderBy: { createdAt: "desc" },
  });
}

async function findOwnedApproval(userId: string, approvalId: string) {
  const approval = await db.approvalRequest.findFirst({
    where: { id: approvalId, userId },
  });
  if (!approval) throw AppError.notFound("approval request", approvalId);
  return approval;
}

/**
 * A registry of functions that can apply an approved payload, keyed by
 * actionType. The WebMCP tool registry populates this via
 * registerApprovalExecutor() so approval.service never has to import every
 * domain service directly (avoids a circular-import mess).
 */
type ApprovalExecutor = (userId: string, payload: unknown) => Promise<unknown>;
const executors = new Map<string, ApprovalExecutor>();

export function registerApprovalExecutor(
  actionType: string,
  executor: ApprovalExecutor,
) {
  executors.set(actionType, executor);
}

export async function approveRequest(
  userId: string,
  approvalId: string,
  resolvedBy: "human" | "agent" = "human",
) {
  const approval = await findOwnedApproval(userId, approvalId);
  if (approval.status !== "pending") {
    throw AppError.conflict(`This request is already ${approval.status}.`);
  }

  const executor = executors.get(approval.actionType);
  if (!executor) {
    throw new AppError(
      "NO_EXECUTOR",
      `No handler registered for "${approval.actionType}".`,
    );
  }

  const result = await executor(userId, approval.payload);

  await db.approvalRequest.update({
    where: { id: approvalId },
    data: { status: "approved", resolvedAt: new Date(), resolvedBy },
  });

  await logActivity({
    userId,
    type: "APPROVAL_GRANTED",
    actor: resolvedBy,
    summary: `Approved: ${approval.summary}`,
    toolName: approval.actionType,
    approvalRequestId: approval.id,
  });

  return result;
}

export async function rejectRequest(
  userId: string,
  approvalId: string,
  resolvedBy: "human" | "agent" = "human",
) {
  const approval = await findOwnedApproval(userId, approvalId);
  if (approval.status !== "pending") {
    throw AppError.conflict(`This request is already ${approval.status}.`);
  }

  await db.approvalRequest.update({
    where: { id: approvalId },
    data: { status: "rejected", resolvedAt: new Date(), resolvedBy },
  });

  await logActivity({
    userId,
    type: "APPROVAL_REJECTED",
    actor: resolvedBy,
    summary: `Rejected: ${approval.summary}`,
    toolName: approval.actionType,
    approvalRequestId: approval.id,
  });

  return { id: approval.id, status: "rejected" as const };
}
