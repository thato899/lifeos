import { z } from "zod";

export const createScheduleBlockSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    start: z.iso.datetime(),
    end: z.iso.datetime(),
    category: z.string().trim().max(60).optional(),
    taskId: z.string().trim().min(1).optional(),
  })
  .refine((data) => new Date(data.end) > new Date(data.start), {
    message: "End time must be after start time.",
    path: ["end"],
  });
export type CreateScheduleBlockInput = z.infer<
  typeof createScheduleBlockSchema
>;

export const rescheduleTaskSchema = z
  .object({
    taskId: z.string().trim().min(1),
    newStart: z.iso.datetime(),
    newEnd: z.iso.datetime(),
  })
  .refine((data) => new Date(data.newEnd) > new Date(data.newStart), {
    message: "End time must be after start time.",
    path: ["newEnd"],
  });
export type RescheduleTaskInput = z.infer<typeof rescheduleTaskSchema>;

export const getScheduleSchema = z.object({
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime(),
});
export type GetScheduleInput = z.infer<typeof getScheduleSchema>;

export const planConstraintsSchema = z.object({
  noScheduleAfter: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  noScheduleBefore: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  excludeCategories: z.array(z.string().trim().max(60)).optional(),
});
export type PlanConstraints = z.infer<typeof planConstraintsSchema>;

export const planMyDaySchema = z.object({
  date: z.iso.date(),
  availableMinutes: z
    .number()
    .int()
    .min(15)
    .max(24 * 60)
    .optional(),
  constraints: planConstraintsSchema.optional(),
});
export type PlanMyDayInput = z.infer<typeof planMyDaySchema>;

export const planMyWeekSchema = z.object({
  weekStart: z.iso.date(),
  constraints: planConstraintsSchema.optional(),
});
export type PlanMyWeekInput = z.infer<typeof planMyWeekSchema>;
