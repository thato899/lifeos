"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth-scope";
import { errorToServiceResult, toServiceResult } from "@/lib/errors/app-error";
import {
  approveRequest,
  listApprovals,
  rejectRequest,
} from "@/services/approval.service";

// The human-approval half of the loop described in spec section 16/30: an
// agent's high-impact tool call creates a pending ApprovalRequest instead
// of mutating anything; these two actions are the only way one ever turns
// into a real change, and they only run for the signed-in owner of the
// request (approveRequest/rejectRequest re-check that).

export async function approveRequestAction(approvalId: string) {
  try {
    const userId = await requireUserId();
    const result = await approveRequest(userId, approvalId, "human");
    revalidatePath("/app");
    return toServiceResult(result);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

export async function rejectRequestAction(approvalId: string) {
  try {
    const userId = await requireUserId();
    const result = await rejectRequest(userId, approvalId, "human");
    revalidatePath("/app");
    return toServiceResult(result);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

export async function getPendingApprovalsAction() {
  try {
    const userId = await requireUserId();
    const approvals = await listApprovals(userId, "pending");
    return toServiceResult(approvals);
  } catch (error) {
    return errorToServiceResult(error);
  }
}
