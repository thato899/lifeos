import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { logActivity, type Actor } from "@/lib/activity/log";
import { AppError } from "@/lib/errors/app-error";
import { scoreTask } from "@/lib/planning/priority-score";
import type { TaskLite } from "@/lib/planning/types";
import type {
  CreateTaskInput,
  ListTasksInput,
  UpdateTaskInput,
} from "@/lib/validation/task";

/**
 * The task service is the one place task business rules and persistence
 * live. Server actions (human UI) and WebMCP tools both call these
 * functions — never Prisma directly — so the two surfaces can never drift
 * apart in behavior. See docs/architecture.md "Service layer".
 */

const taskInclude = { tags: true } as const;

function toTaskLite(task: {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueDate: Date | null;
  estimatedMinutes: number | null;
  category: string | null;
}): TaskLite {
  return {
    id: task.id,
    title: task.title,
    priority: task.priority as TaskLite["priority"],
    status: task.status as TaskLite["status"],
    dueDate: task.dueDate,
    estimatedMinutes: task.estimatedMinutes,
    category: task.category,
  };
}

function summarize(task: Awaited<ReturnType<typeof db.task.findFirstOrThrow>>) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    notes: task.notes,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate,
    estimatedMinutes: task.estimatedMinutes,
    category: task.category,
    priorityScore: task.priorityScore,
    goalId: task.goalId,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

async function recalculateAndPersistScore(taskId: string) {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return;
  const { score } = scoreTask(toTaskLite(task));
  await db.task.update({
    where: { id: taskId },
    data: { priorityScore: score },
  });
}

async function findOwnedTask(userId: string, taskId: string) {
  const task = await db.task.findFirst({
    where: { id: taskId, userId },
    include: taskInclude,
  });
  if (!task) throw AppError.notFound("task", taskId);
  return task;
}

export async function listTasks(userId: string, filters: ListTasksInput = {}) {
  const tasks = await db.task.findMany({
    where: {
      userId,
      status: filters.status,
      priority: filters.priority,
      category: filters.category,
      dueDate: {
        ...(filters.dueBefore ? { lte: new Date(filters.dueBefore) } : {}),
        ...(filters.dueAfter ? { gte: new Date(filters.dueAfter) } : {}),
      },
    },
    include: taskInclude,
    orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
  });
  return tasks.map(summarize);
}

export async function getTask(userId: string, taskId: string) {
  const task = await findOwnedTask(userId, taskId);
  return summarize(task);
}

export async function createTask(
  userId: string,
  input: CreateTaskInput,
  actor: Actor,
) {
  if (input.goalId) {
    const goal = await db.goal.findFirst({
      where: { id: input.goalId, userId },
    });
    if (!goal) throw AppError.notFound("goal", input.goalId);
  }

  const task = await db.task.create({
    data: {
      userId,
      title: input.title,
      description: input.description,
      notes: input.notes,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      estimatedMinutes: input.estimatedMinutes,
      category: input.category,
      recurrence: input.recurrence,
      goalId: input.goalId,
      tags: input.tags
        ? { create: input.tags.map((name) => ({ name })) }
        : undefined,
    },
    include: taskInclude,
  });

  await recalculateAndPersistScore(task.id);

  await logActivity({
    userId,
    type: "TASK_CREATED",
    actor,
    summary: `Created task "${task.title}"`,
    metadata: { taskId: task.id, priority: task.priority },
  });

  return getTask(userId, task.id);
}

export async function updateTask(
  userId: string,
  input: UpdateTaskInput,
  actor: Actor,
) {
  const existing = await findOwnedTask(userId, input.taskId);

  if (input.goalId) {
    const goal = await db.goal.findFirst({
      where: { id: input.goalId, userId },
    });
    if (!goal) throw AppError.notFound("goal", input.goalId);
  }

  const { taskId, tags, goalId, recurrence, ...fields } = input;

  await db.task.update({
    where: { id: taskId },
    data: {
      ...fields,
      dueDate:
        fields.dueDate === undefined
          ? undefined
          : fields.dueDate
            ? new Date(fields.dueDate)
            : null,
      recurrence:
        recurrence === undefined ? undefined : (recurrence ?? Prisma.JsonNull),
      ...(goalId === undefined
        ? {}
        : {
            goal: goalId ? { connect: { id: goalId } } : { disconnect: true },
          }),
      ...(tags
        ? {
            tags: {
              deleteMany: {},
              create: tags.map((name) => ({ name })),
            },
          }
        : {}),
    },
  });

  await recalculateAndPersistScore(taskId);

  await logActivity({
    userId,
    type: "TASK_UPDATED",
    actor,
    summary: `Updated task "${fields.title ?? existing.title}"`,
    metadata: { taskId, fields: Object.keys(fields) },
  });

  return getTask(userId, taskId);
}

export async function completeTask(
  userId: string,
  taskId: string,
  actor: Actor,
) {
  const task = await findOwnedTask(userId, taskId);

  await db.task.update({
    where: { id: taskId },
    data: { status: "completed", completedAt: new Date() },
  });

  await logActivity({
    userId,
    type: "TASK_COMPLETED",
    actor,
    summary: `Completed task "${task.title}"`,
    metadata: { taskId },
  });

  return getTask(userId, taskId);
}

export async function reopenTask(userId: string, taskId: string, actor: Actor) {
  const task = await findOwnedTask(userId, taskId);

  await db.task.update({
    where: { id: taskId },
    data: { status: "planned", completedAt: null },
  });
  await recalculateAndPersistScore(taskId);

  await logActivity({
    userId,
    type: "TASK_REOPENED",
    actor,
    summary: `Reopened task "${task.title}"`,
    metadata: { taskId },
  });

  return getTask(userId, taskId);
}

export async function deleteTask(userId: string, taskId: string, actor: Actor) {
  const task = await findOwnedTask(userId, taskId);

  await db.task.delete({ where: { id: taskId } });

  await logActivity({
    userId,
    type: "TASK_DELETED",
    actor,
    summary: `Deleted task "${task.title}"`,
    metadata: { taskId },
  });

  return { id: taskId, title: task.title };
}

/** Used by identify_conflicts / plan_my_day / plan_my_week to get plain planning-engine shapes. */
export async function listTasksLite(userId: string): Promise<TaskLite[]> {
  const tasks = await db.task.findMany({ where: { userId } });
  return tasks.map(toTaskLite);
}
