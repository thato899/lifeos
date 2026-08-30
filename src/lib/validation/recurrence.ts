import { z } from "zod";

/**
 * Structured recurrence rule stored as JSON on Task.recurrence and used as
 * Routine.frequency's richer counterpart. Kept intentionally small — LifeOS
 * is not trying to reimplement iCal RRULEs, just the handful of patterns a
 * personal task list actually needs.
 */
export const recurrenceSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly"]),
  interval: z.number().int().min(1).max(52).default(1),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(), // 0 = Sunday
  endDate: z.iso.datetime().optional(),
});

export type Recurrence = z.infer<typeof recurrenceSchema>;
