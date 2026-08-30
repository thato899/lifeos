import { db } from "@/lib/db";
import { logActivity, type Actor } from "@/lib/activity/log";
import { AppError } from "@/lib/errors/app-error";
import { generateActionPlan } from "@/lib/planning/goal-plan";
import type {
  CreateGoalInput,
  ListGoalsInput,
  UpdateGoalInput,
  UpdateGoalProgressInput,
} from "@/lib/validation/goal";
import { createTask } from "./task.service";

const goalInclude = { milestones: { orderBy: { order: "asc" } as const } };

async function findOwnedGoal(userId: string, goalId: string) {
  const goal = await db.goal.findFirst({
    where: { id: goalId, userId },
    include: goalInclude,
  });
  if (!goal) throw AppError.notFound("goal", goalId);
  return goal;
}

export async function listGoals(userId: string, filters: ListGoalsInput = {}) {
  return db.goal.findMany({
    where: { userId, status: filters.status },
    include: goalInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getGoal(userId: string, goalId: string) {
  return findOwnedGoal(userId, goalId);
}

export async function createGoal(
  userId: string,
  input: CreateGoalInput,
  actor: Actor,
) {
  const goal = await db.goal.create({
    data: {
      userId,
      title: input.title,
      description: input.description,
      targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
      category: input.category,
      milestones: input.milestones
        ? {
            create: input.milestones.map((m, i) => ({
              title: m.title,
              targetDate: m.targetDate ? new Date(m.targetDate) : undefined,
              order: i,
            })),
          }
        : undefined,
    },
    include: goalInclude,
  });

  await logActivity({
    userId,
    type: "GOAL_CREATED",
    actor,
    summary: `Created goal "${goal.title}"`,
    metadata: { goalId: goal.id },
  });

  return goal;
}

export async function updateGoal(
  userId: string,
  input: UpdateGoalInput,
  actor: Actor,
) {
  const existing = await findOwnedGoal(userId, input.goalId);
  const { goalId, targetDate, ...fields } = input;

  const goal = await db.goal.update({
    where: { id: goalId },
    data: {
      ...fields,
      targetDate:
        targetDate === undefined
          ? undefined
          : targetDate
            ? new Date(targetDate)
            : null,
    },
    include: goalInclude,
  });

  await logActivity({
    userId,
    type: "GOAL_UPDATED",
    actor,
    summary: `Updated goal "${fields.title ?? existing.title}"`,
    metadata: { goalId, fields: Object.keys(fields) },
  });

  return goal;
}

export async function updateGoalProgress(
  userId: string,
  input: UpdateGoalProgressInput,
  actor: Actor,
) {
  const existing = await findOwnedGoal(userId, input.goalId);
  const progress = Math.max(0, Math.min(100, input.progress));

  const goal = await db.goal.update({
    where: { id: input.goalId },
    data: {
      progress,
      status:
        progress === 100 && existing.status === "active"
          ? "completed"
          : existing.status,
    },
    include: goalInclude,
  });

  await logActivity({
    userId,
    type: "GOAL_UPDATED",
    actor,
    summary: `Updated progress on "${existing.title}" to ${progress}%`,
    metadata: { goalId: input.goalId, progress },
  });

  return goal;
}

export async function deleteGoal(userId: string, goalId: string, actor: Actor) {
  const goal = await findOwnedGoal(userId, goalId);
  await db.goal.delete({ where: { id: goalId } });

  await logActivity({
    userId,
    type: "GOAL_DELETED",
    actor,
    summary: `Deleted goal "${goal.title}"`,
    metadata: { goalId },
  });

  return { id: goalId, title: goal.title };
}

/**
 * LifeOS's action-plan heuristic (see lib/planning/goal-plan.ts), turned
 * into real tasks linked back to the goal. Non-destructive and reversible
 * (delete_task undoes it), so this executes directly rather than requiring
 * approval.
 */
export async function createActionPlan(
  userId: string,
  goalId: string,
  actor: Actor,
) {
  const goal = await findOwnedGoal(userId, goalId);
  const suggestions = generateActionPlan(goal, goal.milestones);

  const tasks = [];
  for (const s of suggestions) {
    const created = await createTask(
      userId,
      {
        title: s.title,
        priority: "medium",
        dueDate: s.dueDate?.toISOString(),
        goalId: goal.id,
      },
      actor,
    );
    tasks.push(created);
  }

  await logActivity({
    userId,
    type: "GOAL_UPDATED",
    actor,
    summary: `Created a ${tasks.length}-task action plan for "${goal.title}"`,
    metadata: { goalId, taskCount: tasks.length },
  });

  return { goal, tasks };
}
