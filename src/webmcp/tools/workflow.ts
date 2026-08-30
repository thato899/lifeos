import { z } from "zod";
import { analyzeSpendingSchema } from "@/lib/validation/expense";
import { planMyDaySchema, planMyWeekSchema } from "@/lib/validation/schedule";
import { analyzeSpendingForUser } from "@/services/expense.service";
import {
  analyzeDay,
  identifyConflictsForUser,
  planMyDayForUser,
  planMyWeekForUser,
  prioritizeTasksForUser,
} from "@/services/overview.service";
import { applySchedulePlan } from "@/services/schedule.service";
import { defineTool } from "../types";

/**
 * The "high-level agent workflow" tools (spec section 20). These are what
 * make WebMCP more than remote-control CRUD: analyze_day, plan_my_day, and
 * plan_my_week run LifeOS's own planning engine (lib/planning/*) across
 * tasks + schedule + preferences in one call, instead of making the agent
 * fetch three things and reimplement the reasoning itself in the chat
 * model. plan_my_day/plan_my_week only *propose* — they never write to the
 * calendar — so the agent can present a plan and let the human react before
 * anything is committed via apply_schedule_plan.
 */

export const analyzeDayTool = defineTool({
  name: "analyze_day",
  title: "Analyze a day's workload",
  description:
    "Use this to understand how loaded a specific day is before proposing changes: open/overdue/due-today task counts, minutes already scheduled, detected conflicts, and the day's top-priority tasks. Defaults to today if date is omitted.",
  inputSchema: z.object({ date: z.iso.date().optional() }),
  riskLevel: "read",
  untrustedOutput: true,
  summarize: (input) => `Analyzed workload for ${input.date ?? "today"}`,
  execute: (userId, input) =>
    analyzeDay(userId, input.date ? new Date(input.date) : undefined),
});

export const identifyConflictsTool = defineTool({
  name: "identify_conflicts",
  title: "Identify scheduling conflicts",
  description:
    "Use this to find overlapping schedule blocks, items scheduled outside the user's available hours, overloaded days, and clashing high-priority deadlines — the checks to run before proposing any schedule change.",
  inputSchema: z.object({}),
  riskLevel: "read",
  untrustedOutput: true,
  summarize: () => "Checked for scheduling conflicts",
  execute: (userId) => identifyConflictsForUser(userId),
});

export const prioritizeTasksTool = defineTool({
  name: "prioritize_tasks",
  title: "Prioritize tasks",
  description:
    "Use this to get the user's open tasks ranked by LifeOS's priority-score heuristic, each with a short explanation (e.g. 'overdue by 3 days, urgent priority'). Use it to answer 'what should I focus on?' or 'what am I behind on?'.",
  inputSchema: z.object({}),
  riskLevel: "read",
  untrustedOutput: true,
  summarize: () => "Ranked tasks by priority",
  execute: (userId) => prioritizeTasksForUser(userId),
});

export const analyzeSpendingTool = defineTool({
  name: "analyze_spending",
  title: "Analyze spending",
  description:
    "Use this to answer spending questions like 'where am I spending the most this month?' or 'how much did I spend on food?'. Returns totals by category, budget variance where the user has set targets, and any category that jumped more than 40% versus the prior period. Defaults to month-to-date if dates are omitted.",
  inputSchema: analyzeSpendingSchema,
  riskLevel: "read",
  untrustedOutput: false,
  summarize: () => "Analyzed spending",
  execute: (userId, input) =>
    analyzeSpendingForUser(userId, input.startDate, input.endDate),
});

export const planMyDayTool = defineTool({
  name: "plan_my_day",
  title: "Propose a plan for a day",
  description:
    "Use this to propose a schedule for a specific day (ISO date) around the user's open tasks and existing commitments. Ranks tasks by priority and fits as many as possible into free time, respecting working hours and any noScheduleAfter/noScheduleBefore/excludeCategories constraints you pass (e.g. 'don't schedule anything after 7pm' -> constraints.noScheduleAfter: '19:00'). This only proposes — present it to the user and use apply_schedule_plan once they approve.",
  inputSchema: planMyDaySchema,
  riskLevel: "read",
  untrustedOutput: true,
  summarize: (input) => `Proposed a plan for ${input.date}`,
  execute: (userId, input) =>
    planMyDayForUser(
      userId,
      input.date,
      input.availableMinutes,
      input.constraints,
    ),
});

export const planMyWeekTool = defineTool({
  name: "plan_my_week",
  title: "Propose a plan for a week",
  description:
    "Use this to propose a full week's schedule starting from weekStart (ISO date, typically a Monday), distributing open tasks across the 7 days by priority while respecting existing commitments and any constraints (noScheduleAfter/noScheduleBefore/excludeCategories). This only proposes — present it to the user and use apply_schedule_plan once they approve.",
  inputSchema: planMyWeekSchema,
  riskLevel: "read",
  untrustedOutput: true,
  summarize: (input) => `Proposed a plan for the week of ${input.weekStart}`,
  execute: (userId, input) =>
    planMyWeekForUser(userId, input.weekStart, input.constraints),
});

const applySchedulePlanSchema = z.object({
  blocks: z
    .array(
      z.object({
        taskId: z.string().trim().min(1),
        title: z.string().trim().min(1),
        start: z.iso.datetime(),
        end: z.iso.datetime(),
      }),
    )
    .min(1)
    .max(50),
});

export const applySchedulePlanTool = defineTool({
  name: "apply_schedule_plan",
  title: "Apply a proposed plan",
  description:
    "Use this to commit the blocks from a plan_my_day/plan_my_week proposal (or a set of task moves you've assembled) to the actual calendar. This creates multiple schedule changes at once, so it always requires the user's explicit approval before it takes effect — present the proposal first, then call this once they say yes.",
  inputSchema: applySchedulePlanSchema,
  riskLevel: "high_write",
  untrustedOutput: false,
  summarize: (input) =>
    `Apply a plan that schedules ${input.blocks.length} task(s)`,
  execute: (userId, input, actor) =>
    applySchedulePlan(userId, input.blocks, actor),
});

export const workflowTools = [
  analyzeDayTool,
  identifyConflictsTool,
  prioritizeTasksTool,
  analyzeSpendingTool,
  planMyDayTool,
  planMyWeekTool,
  applySchedulePlanTool,
];
