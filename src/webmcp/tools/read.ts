import { z } from "zod";
import { getExpensesSchema } from "@/lib/validation/expense";
import { listGoalsSchema } from "@/lib/validation/goal";
import { getScheduleSchema } from "@/lib/validation/schedule";
import { getShoppingListSchema } from "@/lib/validation/shopping";
import { listTasksSchema } from "@/lib/validation/task";
import { listExpenses } from "@/services/expense.service";
import { listGoals } from "@/services/goal.service";
import { getTodayOverview } from "@/services/overview.service";
import { listRoutines } from "@/services/routine.service";
import { getSchedule } from "@/services/schedule.service";
import { getShoppingList } from "@/services/shopping.service";
import { getTask, listTasks } from "@/services/task.service";
import { defineTool } from "../types";

export const getTodayOverviewTool = defineTool({
  name: "get_today_overview",
  title: "Get today's overview",
  description:
    "Use this when the user asks what's on their plate today, e.g. 'show me everything I need to do today'. Returns today's top priorities, overdue tasks, due-today count, today's schedule, upcoming deadlines, and active goals in one call — the starting point for most planning conversations.",
  inputSchema: z.object({}),
  riskLevel: "read",
  untrustedOutput: true,
  summarize: () => "Retrieved today's overview",
  execute: (userId) => getTodayOverview(userId),
});

export const getTasksTool = defineTool({
  name: "get_tasks",
  title: "Get tasks",
  description:
    "Use this to list the user's tasks, optionally filtered by status, priority, category, or due-date range (dueBefore/dueAfter, ISO datetimes). Use it to answer questions like 'what am I behind on?' (filter status and check dueDate client-side, or just call it and inspect the returned priorityScore/overdue tasks in get_today_overview instead) or 'show me my high priority tasks'.",
  inputSchema: listTasksSchema,
  riskLevel: "read",
  untrustedOutput: true,
  summarize: (input) =>
    `Retrieved tasks${input.status ? ` (status: ${input.status})` : ""}`,
  execute: (userId, input) => listTasks(userId, input),
});

export const getTaskTool = defineTool({
  name: "get_task",
  title: "Get a single task",
  description:
    "Use this to fetch full details for one specific task when you already know its taskId.",
  inputSchema: z.object({ taskId: z.string().trim().min(1) }),
  riskLevel: "read",
  untrustedOutput: true,
  summarize: (input) => `Retrieved task ${input.taskId}`,
  execute: (userId, input) => getTask(userId, input.taskId),
});

export const getScheduleTool = defineTool({
  name: "get_schedule",
  title: "Get schedule",
  description:
    "Use this to see what's on the calendar between startDate and endDate (ISO datetimes). Use it before proposing a plan so you know what's already committed.",
  inputSchema: getScheduleSchema,
  riskLevel: "read",
  untrustedOutput: true,
  summarize: (input) =>
    `Retrieved schedule from ${input.startDate} to ${input.endDate}`,
  execute: (userId, input) =>
    getSchedule(userId, input.startDate, input.endDate),
});

export const getGoalsTool = defineTool({
  name: "get_goals",
  title: "Get goals",
  description:
    "Use this to list the user's goals, optionally filtered by status (active/paused/completed/abandoned). Each goal includes its milestones and progress.",
  inputSchema: listGoalsSchema,
  riskLevel: "read",
  untrustedOutput: true,
  summarize: (input) =>
    `Retrieved goals${input.status ? ` (status: ${input.status})` : ""}`,
  execute: (userId, input) => listGoals(userId, input),
});

export const getShoppingListTool = defineTool({
  name: "get_shopping_list",
  title: "Get a shopping list",
  description:
    "Use this to view a shopping list and its items. Pass listId for a specific list, or omit it to get the user's most recently created list — useful for 'what's on my grocery list?'.",
  inputSchema: getShoppingListSchema,
  riskLevel: "read",
  untrustedOutput: true,
  summarize: (input) =>
    input.listId
      ? `Retrieved shopping list ${input.listId}`
      : "Retrieved most recent shopping list",
  execute: (userId, input) => getShoppingList(userId, input.listId),
});

export const getExpensesTool = defineTool({
  name: "get_expenses",
  title: "Get expenses",
  description:
    "Use this to list recorded expenses, optionally filtered by startDate, endDate (ISO datetimes), and/or category. Use it before analyze_spending when you need the raw transaction list rather than an aggregated summary.",
  inputSchema: getExpensesSchema,
  riskLevel: "read",
  untrustedOutput: true,
  summarize: () => "Retrieved expenses",
  execute: (userId, input) => listExpenses(userId, input),
});

export const getRoutinesTool = defineTool({
  name: "get_routines",
  title: "Get routines",
  description:
    "Use this to list the user's active recurring routines (e.g. morning routine, weekly shopping) and their steps.",
  inputSchema: z.object({ includeInactive: z.boolean().default(false) }),
  riskLevel: "read",
  untrustedOutput: true,
  summarize: () => "Retrieved routines",
  execute: (userId, input) => listRoutines(userId, !input.includeInactive),
});

export const readTools = [
  getTodayOverviewTool,
  getTasksTool,
  getTaskTool,
  getScheduleTool,
  getGoalsTool,
  getShoppingListTool,
  getExpensesTool,
  getRoutinesTool,
];
