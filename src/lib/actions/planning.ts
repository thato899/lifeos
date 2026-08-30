"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth-scope";
import { errorToServiceResult, toServiceResult } from "@/lib/errors/app-error";
import {
  planMyDayForUser,
  planMyWeekForUser,
} from "@/services/overview.service";
import {
  applySchedulePlan,
  type PlanBlockInput,
} from "@/services/schedule.service";

/**
 * The manual-UI equivalent of plan_my_day / plan_my_week / apply_schedule_plan
 * (spec section 33 — "everything exposed through WebMCP should also have a
 * good human interface"). A human clicking "Apply" here is their own
 * approval, same as any other human-initiated action — see docs/security.md.
 */
export async function planMyDayAction(date: string, availableMinutes?: number) {
  try {
    const userId = await requireUserId();
    const plan = await planMyDayForUser(userId, date, availableMinutes);
    return toServiceResult(plan);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

export async function planMyWeekAction(weekStart: string) {
  try {
    const userId = await requireUserId();
    const plan = await planMyWeekForUser(userId, weekStart);
    return toServiceResult(plan);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

export async function applyPlanAction(blocks: PlanBlockInput[]) {
  try {
    const userId = await requireUserId();
    const result = await applySchedulePlan(userId, blocks, "human");
    revalidatePath("/app");
    return toServiceResult(result);
  } catch (error) {
    return errorToServiceResult(error);
  }
}
