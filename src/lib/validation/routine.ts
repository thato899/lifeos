import { z } from "zod";

export const RECURRENCE_FREQUENCIES = [
  "none",
  "daily",
  "weekly",
  "monthly",
] as const;

export const createRoutineSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  frequency: z.enum(RECURRENCE_FREQUENCIES).default("weekly"),
  steps: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        estimatedMinutes: z
          .number()
          .int()
          .min(1)
          .max(24 * 60)
          .optional(),
      }),
    )
    .min(1, "A routine needs at least one step.")
    .max(50),
});
export type CreateRoutineInput = z.infer<typeof createRoutineSchema>;

export const updateRoutineSchema = z.object({
  routineId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  frequency: z.enum(RECURRENCE_FREQUENCIES).optional(),
  active: z.boolean().optional(),
  steps: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        estimatedMinutes: z
          .number()
          .int()
          .min(1)
          .max(24 * 60)
          .optional(),
      }),
    )
    .max(50)
    .optional(),
});
export type UpdateRoutineInput = z.infer<typeof updateRoutineSchema>;
