import { z } from "zod";

export const GOAL_STATUSES = [
  "active",
  "paused",
  "completed",
  "abandoned",
] as const;

export const createGoalSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  targetDate: z.iso.datetime().optional(),
  category: z.string().trim().max(60).optional(),
  milestones: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        targetDate: z.iso.datetime().optional(),
      }),
    )
    .max(50)
    .optional(),
});
export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalProgressSchema = z.object({
  goalId: z.string().trim().min(1),
  progress: z.number().int().min(0).max(100),
});
export type UpdateGoalProgressInput = z.infer<typeof updateGoalProgressSchema>;

export const updateGoalSchema = z.object({
  goalId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  targetDate: z.iso.datetime().nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
  status: z.enum(GOAL_STATUSES).optional(),
});
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const listGoalsSchema = z.object({
  status: z.enum(GOAL_STATUSES).optional(),
});
export type ListGoalsInput = z.infer<typeof listGoalsSchema>;

export const createActionPlanSchema = z.object({
  goalId: z.string().trim().min(1),
});
export type CreateActionPlanInput = z.infer<typeof createActionPlanSchema>;
