import {
  createScheduleBlockSchema,
  rescheduleTaskSchema,
} from "@/lib/validation/schedule";
import {
  createScheduleBlock,
  rescheduleTask,
} from "@/services/schedule.service";
import { defineTool } from "../types";

export const createScheduleBlockTool = defineTool({
  name: "create_schedule_block",
  title: "Add a schedule block",
  description:
    "Use this to put something on the calendar directly — a meeting, appointment, or work block with a specific start and end time (ISO datetimes). Optionally link it to an existing task via taskId.",
  inputSchema: createScheduleBlockSchema,
  riskLevel: "low_write",
  untrustedOutput: true,
  summarize: (input) =>
    `Scheduled "${input.title}" from ${input.start} to ${input.end}`,
  execute: (userId, input, actor) => createScheduleBlock(userId, input, actor),
});

export const rescheduleTaskTool = defineTool({
  name: "reschedule_task",
  title: "Reschedule a task",
  description:
    "Use this when the user wants to move a single task to a new day/time, e.g. 'move grocery shopping to Saturday'. Creates a schedule block for the task if it doesn't have one yet, or moves its existing one.",
  inputSchema: rescheduleTaskSchema,
  riskLevel: "low_write",
  untrustedOutput: true,
  summarize: (input) => `Rescheduled task ${input.taskId} to ${input.newStart}`,
  execute: (userId, input, actor) => rescheduleTask(userId, input, actor),
});

export const scheduleTools = [createScheduleBlockTool, rescheduleTaskTool];
