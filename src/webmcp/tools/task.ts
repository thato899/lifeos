import { z } from "zod";
import { createTaskSchema, updateTaskSchema } from "@/lib/validation/task";
import {
  completeTask,
  createTask,
  deleteTask,
  reopenTask,
  updateTask,
} from "@/services/task.service";
import { defineTool } from "../types";

export const createTaskTool = defineTool({
  name: "create_task",
  title: "Create a task",
  description:
    "Use this to add a new task to the user's list. Only title is required. Set priority (low/medium/high/urgent), dueDate (ISO datetime), estimatedMinutes, category, and tags when the user's request implies them — don't guess a due date the user didn't mention.",
  inputSchema: createTaskSchema,
  riskLevel: "low_write",
  untrustedOutput: true,
  summarize: (input) => `Created task "${input.title}"`,
  execute: (userId, input, actor) => createTask(userId, input, actor),
});

export const updateTaskTool = defineTool({
  name: "update_task",
  title: "Update a task",
  description:
    "Use this when the user wants to change an existing task's title, description, priority, due date, estimated duration, category, tags, status, or recurrence. Requires taskId — look it up with get_tasks first if you only have a title.",
  inputSchema: updateTaskSchema,
  riskLevel: "low_write",
  untrustedOutput: true,
  summarize: (input) => `Updated task ${input.taskId}`,
  execute: (userId, input, actor) => updateTask(userId, input, actor),
});

export const completeTaskTool = defineTool({
  name: "complete_task",
  title: "Complete a task",
  description: "Use this to mark a task as done.",
  inputSchema: z.object({ taskId: z.string().trim().min(1) }),
  riskLevel: "low_write",
  untrustedOutput: true,
  summarize: (input) => `Completed task ${input.taskId}`,
  execute: (userId, input, actor) => completeTask(userId, input.taskId, actor),
});

export const reopenTaskTool = defineTool({
  name: "reopen_task",
  title: "Reopen a task",
  description:
    "Use this to move a completed task back to planned, e.g. if the user says a task isn't actually finished.",
  inputSchema: z.object({ taskId: z.string().trim().min(1) }),
  riskLevel: "low_write",
  untrustedOutput: true,
  summarize: (input) => `Reopened task ${input.taskId}`,
  execute: (userId, input, actor) => reopenTask(userId, input.taskId, actor),
});

export const deleteTaskTool = defineTool({
  name: "delete_task",
  title: "Delete a task",
  description:
    "Use this to permanently remove a task. This is a high-impact, irreversible action — it always requires the user's explicit approval before it takes effect, even if they asked for it directly. Tell the user you're requesting approval.",
  inputSchema: z.object({ taskId: z.string().trim().min(1) }),
  riskLevel: "high_write",
  untrustedOutput: false,
  summarize: (input) => `Delete task ${input.taskId} — this cannot be undone.`,
  execute: (userId, input, actor) => deleteTask(userId, input.taskId, actor),
});

export const taskTools = [
  createTaskTool,
  updateTaskTool,
  completeTaskTool,
  reopenTaskTool,
  deleteTaskTool,
];
