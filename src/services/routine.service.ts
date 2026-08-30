import { db } from "@/lib/db";
import { logActivity, type Actor } from "@/lib/activity/log";
import { AppError } from "@/lib/errors/app-error";
import type {
  CreateRoutineInput,
  UpdateRoutineInput,
} from "@/lib/validation/routine";

const routineInclude = { steps: { orderBy: { order: "asc" } as const } };

async function findOwnedRoutine(userId: string, routineId: string) {
  const routine = await db.routine.findFirst({
    where: { id: routineId, userId },
    include: routineInclude,
  });
  if (!routine) throw AppError.notFound("routine", routineId);
  return routine;
}

export async function listRoutines(userId: string, activeOnly = true) {
  return db.routine.findMany({
    where: { userId, active: activeOnly ? true : undefined },
    include: routineInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function createRoutine(
  userId: string,
  input: CreateRoutineInput,
  actor: Actor,
) {
  const routine = await db.routine.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
      frequency: input.frequency,
      steps: {
        create: input.steps.map((s, i) => ({
          title: s.title,
          estimatedMinutes: s.estimatedMinutes,
          order: i,
        })),
      },
    },
    include: routineInclude,
  });

  await logActivity({
    userId,
    type: "ROUTINE_CREATED",
    actor,
    summary: `Created routine "${routine.name}" (${input.steps.length} steps)`,
    metadata: { routineId: routine.id },
  });

  return routine;
}

export async function updateRoutine(
  userId: string,
  input: UpdateRoutineInput,
  actor: Actor,
) {
  const existing = await findOwnedRoutine(userId, input.routineId);
  const { routineId, steps, ...fields } = input;

  const routine = await db.routine.update({
    where: { id: routineId },
    data: {
      ...fields,
      ...(steps
        ? {
            steps: {
              deleteMany: {},
              create: steps.map((s, i) => ({
                title: s.title,
                estimatedMinutes: s.estimatedMinutes,
                order: i,
              })),
            },
          }
        : {}),
    },
    include: routineInclude,
  });

  await logActivity({
    userId,
    type: "ROUTINE_UPDATED",
    actor,
    summary: `Updated routine "${fields.name ?? existing.name}"`,
    metadata: { routineId },
  });

  return routine;
}

export async function deleteRoutine(
  userId: string,
  routineId: string,
  actor: Actor,
) {
  const routine = await findOwnedRoutine(userId, routineId);
  await db.routine.delete({ where: { id: routineId } });

  await logActivity({
    userId,
    type: "ROUTINE_DELETED",
    actor,
    summary: `Deleted routine "${routine.name}"`,
    metadata: { routineId },
  });

  return { id: routineId, name: routine.name };
}
