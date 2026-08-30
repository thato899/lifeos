import { z } from "zod";
import {
  EXPENSE_CATEGORIES,
  recordExpenseSchema,
  setBudgetSchema,
} from "@/lib/validation/expense";
import {
  deleteBudget,
  recordExpense,
  setBudget,
} from "@/services/expense.service";
import { defineTool } from "../types";

export const recordExpenseTool = defineTool({
  name: "record_expense",
  title: "Record an expense",
  description:
    "Use this to log a single expense the user mentions — amount, category (housing/food/transport/utilities/education/entertainment/subscriptions/other), date (ISO datetime), and an optional description.",
  inputSchema: recordExpenseSchema,
  riskLevel: "low_write",
  untrustedOutput: false,
  summarize: (input) =>
    `Recorded a ${input.category} expense of ${input.amount}`,
  execute: (userId, input, actor) => recordExpense(userId, input, actor),
});

export const setBudgetTool = defineTool({
  name: "set_budget",
  title: "Set a spending target",
  description:
    "Use this when the user wants to set or change a monthly spending target for a category, e.g. 'increase my savings goal' framed as a budget, or 'set my food budget to R2000'. This changes a financial target the user relies on, so it always requires the user's explicit approval before it takes effect.",
  inputSchema: setBudgetSchema,
  riskLevel: "high_write",
  untrustedOutput: false,
  summarize: (input) =>
    `Set the ${input.category} budget to ${input.monthlyLimit}/month`,
  execute: (userId, input, actor) => setBudget(userId, input, actor),
});

export const deleteBudgetTool = defineTool({
  name: "delete_budget",
  title: "Remove a spending target",
  description:
    "Use this when the user wants to remove a category's spending target entirely, e.g. 'remove my entertainment spending target'. This changes a financial target, so it always requires the user's explicit approval before it takes effect.",
  inputSchema: z.object({ category: z.enum(EXPENSE_CATEGORIES) }),
  riskLevel: "high_write",
  untrustedOutput: false,
  summarize: (input) => `Remove the ${input.category} spending target`,
  execute: (userId, input, actor) =>
    deleteBudget(userId, input.category, actor),
});

export const expenseTools = [
  recordExpenseTool,
  setBudgetTool,
  deleteBudgetTool,
];
