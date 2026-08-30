import { db } from "@/lib/db";
import { logActivity, type Actor } from "@/lib/activity/log";
import { AppError } from "@/lib/errors/app-error";
import type { ScheduleBlockLite } from "@/lib/planning/types";
import type {
  CreateScheduleBlockInput,
  RescheduleTaskInput,
} from "@/lib/validation/schedule";

function toLite(block: {
  id: string;
  title: string;
  start: Date;
  end: Date;
  taskId: string | null;
  category: string | null;
}): ScheduleBlockLite {
  return {
    id: block.id,
    title: block.title,
    start: block.start,
    end: block.end,
    taskId: block.taskId,
    category: block.category,
  };
}

export async function getSchedule(
  userId: string,
  startDate: string,
  endDate: string,
) {
  const blocks = await db.scheduleBlock.findMany({
    where: {
      userId,
      start: { gte: new Date(startDate) },
      end: { lte: new Date(endDate) },
    },
    orderBy: { start: "asc" },
  });
  return blocks;
}

export async function listScheduleLite(
  userId: string,
): Promise<ScheduleBlockLite[]> {
  const blocks = await db.scheduleBlock.findMany({ where: { userId } });
  return blocks.map(toLite);
}

export async function createScheduleBlock(
  userId: string,
  input: CreateScheduleBlockInput,
  actor: Actor,
) {
  if (input.taskId) {
    const task = await db.task.findFirst({
      where: { id: input.taskId, userId },
    });
    if (!task) throw AppError.notFound("task", input.taskId);
  }

  const block = await db.scheduleBlock.create({
    data: {
      userId,
      title: input.title,
      start: new Date(input.start),
      end: new Date(input.end),
      category: input.category,
      taskId: input.taskId,
      createdBy: actor,
    },
  });

  await logActivity({
    userId,
    type: "SCHEDULE_CREATED",
    actor,
    summary: `Scheduled "${block.title}" for ${block.start.toLocaleString()}`,
    metadata: { scheduleBlockId: block.id },
  });

  return block;
}

export async function rescheduleTask(
  userId: string,
  input: RescheduleTaskInput,
  actor: Actor,
) {
  const task = await db.task.findFirst({ where: { id: input.taskId, userId } });
  if (!task) throw AppError.notFound("task", input.taskId);

  const existingBlock = await db.scheduleBlock.findFirst({
    where: { taskId: task.id, userId },
  });

  const block = existingBlock
    ? await db.scheduleBlock.update({
        where: { id: existingBlock.id },
        data: { start: new Date(input.newStart), end: new Date(input.newEnd) },
      })
    : await db.scheduleBlock.create({
        data: {
          userId,
          taskId: task.id,
          title: task.title,
          start: new Date(input.newStart),
          end: new Date(input.newEnd),
          createdBy: actor,
        },
      });

  await logActivity({
    userId,
    type: "SCHEDULE_UPDATED",
    actor,
    summary: `Rescheduled "${task.title}" to ${block.start.toLocaleString()}`,
    metadata: { scheduleBlockId: block.id, taskId: task.id },
  });

  return block;
}

export async function deleteScheduleBlock(
  userId: string,
  blockId: string,
  actor: Actor,
) {
  const block = await db.scheduleBlock.findFirst({
    where: { id: blockId, userId },
  });
  if (!block) throw AppError.notFound("schedule block", blockId);

  await db.scheduleBlock.delete({ where: { id: blockId } });

  await logActivity({
    userId,
    type: "SCHEDULE_DELETED",
    actor,
    summary: `Removed "${block.title}" from the schedule`,
    metadata: { scheduleBlockId: blockId },
  });

  return { id: blockId, title: block.title };
}

export interface PlanBlockInput {
  taskId: string;
  title: string;
  start: string;
  end: string;
}

/** Applied only after human approval — see webmcp/tools/workflow.ts (apply_schedule_plan). */
export async function applySchedulePlan(
  userId: string,
  blocks: PlanBlockInput[],
  actor: Actor,
) {
  const created = [];
  for (const b of blocks) {
    const task = await db.task.findFirst({ where: { id: b.taskId, userId } });
    if (!task) continue; // task may have been deleted/completed since the plan was proposed
    const block = await db.scheduleBlock.create({
      data: {
        userId,
        taskId: task.id,
        title: b.title,
        start: new Date(b.start),
        end: new Date(b.end),
        createdBy: actor,
      },
    });
    await db.task.update({
      where: { id: task.id },
      data: { status: "planned" },
    });
    created.push(block);
  }

  await logActivity({
    userId,
    type: "SCHEDULE_CREATED",
    actor,
    summary: `Applied a proposed plan: scheduled ${created.length} task(s)`,
    metadata: { count: created.length },
  });

  return { scheduledCount: created.length, blocks: created };
}
