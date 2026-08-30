import { z } from "zod";

export const EXPENSE_CATEGORIES = [
  "housing",
  "food",
  "transport",
  "utilities",
  "education",
  "entertainment",
  "subscriptions",
  "other",
] as const;

export const recordExpenseSchema = z.object({
  amount: z.number().positive().max(10_000_000),
  category: z.enum(EXPENSE_CATEGORIES),
  date: z.iso.datetime(),
  description: z.string().trim().max(500).optional(),
});
export type RecordExpenseInput = z.infer<typeof recordExpenseSchema>;

export const getExpensesSchema = z.object({
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
});
export type GetExpensesInput = z.infer<typeof getExpensesSchema>;

export const setBudgetSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  monthlyLimit: z.number().positive().max(10_000_000),
});
export type SetBudgetInput = z.infer<typeof setBudgetSchema>;

export const analyzeSpendingSchema = z.object({
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
});
export type AnalyzeSpendingInput = z.infer<typeof analyzeSpendingSchema>;
