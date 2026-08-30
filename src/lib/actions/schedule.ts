"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth-scope";
import { errorToServiceResult, toServiceResult } from "@/lib/errors/app-error";
import {
  createScheduleBlockSchema,
  rescheduleTaskSchema,
} from "@/lib/validation/schedule";
import * as scheduleService from "@/services/schedule.service";

export async function createScheduleBlockAction(input: unknown) {
  try {
    const userId = await requireUserId();
    const parsed = createScheduleBlockSchema.parse(input);
    const block = await scheduleService.createScheduleBlock(
      userId,
      parsed,
      "human",
    );
    revalidatePath("/app");
    return toServiceResult(block);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

export async function rescheduleTaskAction(input: unknown) {
  try {
    const userId = await requireUserId();
    const parsed = rescheduleTaskSchema.parse(input);
    const block = await scheduleService.rescheduleTask(userId, parsed, "human");
    revalidatePath("/app");
    return toServiceResult(block);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

export async function deleteScheduleBlockAction(blockId: string) {
  try {
    const userId = await requireUserId();
    const result = await scheduleService.deleteScheduleBlock(
      userId,
      blockId,
      "human",
    );
    revalidatePath("/app");
    return toServiceResult(result);
  } catch (error) {
    return errorToServiceResult(error);
  }
}
