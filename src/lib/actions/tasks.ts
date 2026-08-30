"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth-scope";
import { errorToServiceResult, toServiceResult } from "@/lib/errors/app-error";
import { createTaskSchema, updateTaskSchema } from "@/lib/validation/task";
import * as taskService from "@/services/task.service";

// Server Actions are the human-UI equivalent of WebMCP tools: same
// services, same validation, actor="human" instead of "agent". Neither
// surface is allowed to skip validation or the userId re-derivation — see
// docs/architecture.md "Service layer".

export async function createTaskAction(formData: FormData) {
  try {
    const userId = await requireUserId();
    const raw = {
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      priority: formData.get("priority") || undefined,
      dueDate: formData.get("dueDate")
        ? new Date(String(formData.get("dueDate"))).toISOString()
        : undefined,
      estimatedMinutes: formData.get("estimatedMinutes")
        ? Number(formData.get("estimatedMinutes"))
        : undefined,
      category: formData.get("category") || undefined,
    };
    const input = createTaskSchema.parse(raw);
    const task = await taskService.createTask(userId, input, "human");
    revalidatePath("/app");
    return toServiceResult(task);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

export async function updateTaskAction(input: unknown) {
  try {
    const userId = await requireUserId();
    const parsed = updateTaskSchema.parse(input);
    const task = await taskService.updateTask(userId, parsed, "human");
    revalidatePath("/app");
    return toServiceResult(task);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

export async function completeTaskAction(taskId: string) {
  try {
    const userId = await requireUserId();
    const task = await taskService.completeTask(userId, taskId, "human");
    revalidatePath("/app");
    return toServiceResult(task);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

export async function reopenTaskAction(taskId: string) {
  try {
    const userId = await requireUserId();
    const task = await taskService.reopenTask(userId, taskId, "human");
    revalidatePath("/app");
    return toServiceResult(task);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

export async function deleteTaskAction(taskId: string) {
  try {
    const userId = await requireUserId();
    const result = await taskService.deleteTask(userId, taskId, "human");
    revalidatePath("/app");
    return toServiceResult(result);
  } catch (error) {
    return errorToServiceResult(error);
  }
}
