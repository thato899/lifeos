"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth-scope";
import { errorToServiceResult, toServiceResult } from "@/lib/errors/app-error";
import {
  createGoalSchema,
  updateGoalProgressSchema,
  updateGoalSchema,
} from "@/lib/validation/goal";
import * as goalService from "@/services/goal.service";

export async function createGoalAction(formData: FormData) {
  try {
    const userId = await requireUserId();
    const input = createGoalSchema.parse({
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      targetDate: formData.get("targetDate")
        ? new Date(String(formData.get("targetDate"))).toISOString()
        : undefined,
      category: formData.get("category") || undefined,
    });
    const goal = await goalService.createGoal(userId, input, "human");
    revalidatePath("/app");
    return toServiceResult(goal);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

export async function updateGoalAction(input: unknown) {
  try {
    const userId = await requireUserId();
    const parsed = updateGoalSchema.parse(input);
    const goal = await goalService.updateGoal(userId, parsed, "human");
    revalidatePath("/app");
    return toServiceResult(goal);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

export async function updateGoalProgressAction(
  goalId: string,
  progress: number,
) {
  try {
    const userId = await requireUserId();
    const parsed = updateGoalProgressSchema.parse({ goalId, progress });
    const goal = await goalService.updateGoalProgress(userId, parsed, "human");
    revalidatePath("/app");
    return toServiceResult(goal);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

export async function deleteGoalAction(goalId: string) {
  try {
    const userId = await requireUserId();
    const result = await goalService.deleteGoal(userId, goalId, "human");
    revalidatePath("/app");
    return toServiceResult(result);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

export async function createActionPlanAction(goalId: string) {
  try {
    const userId = await requireUserId();
    const result = await goalService.createActionPlan(userId, goalId, "human");
    revalidatePath("/app");
    return toServiceResult(result);
  } catch (error) {
    return errorToServiceResult(error);
  }
}
