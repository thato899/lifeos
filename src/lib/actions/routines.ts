"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth-scope";
import { errorToServiceResult, toServiceResult } from "@/lib/errors/app-error";
import { createRoutineSchema } from "@/lib/validation/routine";
import * as routineService from "@/services/routine.service";

export async function createRoutineAction(input: unknown) {
  try {
    const userId = await requireUserId();
    const parsed = createRoutineSchema.parse(input);
    const routine = await routineService.createRoutine(userId, parsed, "human");
    revalidatePath("/app");
    return toServiceResult(routine);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

export async function deleteRoutineAction(routineId: string) {
  try {
    const userId = await requireUserId();
    const result = await routineService.deleteRoutine(
      userId,
      routineId,
      "human",
    );
    revalidatePath("/app");
    return toServiceResult(result);
  } catch (error) {
    return errorToServiceResult(error);
  }
}
