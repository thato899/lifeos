"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth-scope";
import { errorToServiceResult, toServiceResult } from "@/lib/errors/app-error";
import { updateSchedulingPreferences } from "@/services/user.service";

export async function updateSchedulingPreferencesAction(formData: FormData) {
  try {
    const userId = await requireUserId();
    const noScheduleAfter = String(formData.get("noScheduleAfter") ?? "");
    const result = await updateSchedulingPreferences(userId, {
      workingHoursStart: String(formData.get("workingHoursStart")),
      workingHoursEnd: String(formData.get("workingHoursEnd")),
      noScheduleAfter: noScheduleAfter || null,
    });
    revalidatePath("/app");
    return toServiceResult(result);
  } catch (error) {
    return errorToServiceResult(error);
  }
}
