import { z } from "zod";
import { recurrenceSchema } from "./recurrence";

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const TASK_STATUSES = [
  "inbox",
  "planned",
  "in_progress",
  "completed",
  "archived",
] as const;

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).optional(),
  notes: z.string().trim().max(5000).optional(),
  priority: z.enum(PRIORITIES).default("medium"),
  dueDate: z.iso.datetime().optional(),
  estimatedMinutes: z
    .number()
    .int()
    .min(1)
    .max(24 * 60)
    .optional(),
  category: z.string().trim().max(60).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  recurrence: recurrenceSchema.optional(),
  goalId: z.string().trim().min(1).optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  taskId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  dueDate: z.iso.datetime().nullable().optional(),
  estimatedMinutes: z
    .number()
    .int()
    .min(1)
    .max(24 * 60)
    .nullable()
    .optional(),
  category: z.string().trim().max(60).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  recurrence: recurrenceSchema.nullable().optional(),
  goalId: z.string().trim().min(1).nullable().optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const listTasksSchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  category: z.string().trim().max(60).optional(),
  dueBefore: z.iso.datetime().optional(),
  dueAfter: z.iso.datetime().optional(),
});
export type ListTasksInput = z.infer<typeof listTasksSchema>;
