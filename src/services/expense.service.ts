import { db } from "@/lib/db";
import { logActivity, type Actor } from "@/lib/activity/log";
import { AppError } from "@/lib/errors/app-error";
import {
  analyzeSpending,
  type BudgetLite,
  type ExpenseLite,
} from "@/lib/planning/spending";
import type {
  GetExpensesInput,
  RecordExpenseInput,
  SetBudgetInput,
} from "@/lib/validation/expense";

export async function listExpenses(
  userId: string,
  filters: GetExpensesInput = {},
) {
  return db.expense.findMany({
    where: {
      userId,
      category: filters.category,
      date: {
        ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
        ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
      },
    },
    orderBy: { date: "desc" },
  });
}

export async function recordExpense(
  userId: string,
  input: RecordExpenseInput,
  actor: Actor,
) {
  const expense = await db.expense.create({
    data: {
      userId,
      amount: input.amount,
      category: input.category,
      date: new Date(input.date),
      description: input.description,
    },
  });

  await logActivity({
    userId,
    type: "EXPENSE_CREATED",
    actor,
    summary: `Recorded ${input.category} expense of ${input.amount}`,
    metadata: {
      expenseId: expense.id,
      amount: input.amount,
      category: input.category,
    },
  });

  return expense;
}

export async function listBudgets(userId: string) {
  return db.budget.findMany({ where: { userId } });
}

/**
 * High-impact write: changes a spending target the user is relying on to
 * make decisions. Applied via the approval flow — see webmcp/tools/expense.ts.
 */
export async function setBudget(
  userId: string,
  input: SetBudgetInput,
  actor: Actor,
) {
  const budget = await db.budget.upsert({
    where: { userId_category: { userId, category: input.category } },
    update: { monthlyLimit: input.monthlyLimit },
    create: {
      userId,
      category: input.category,
      monthlyLimit: input.monthlyLimit,
    },
  });

  await logActivity({
    userId,
    type: "AGENT_ACTION",
    actor,
    summary: `Set ${input.category} budget to ${input.monthlyLimit}/month`,
    metadata: { category: input.category, monthlyLimit: input.monthlyLimit },
  });

  return budget;
}

export async function deleteBudget(
  userId: string,
  category: string,
  actor: Actor,
) {
  const budget = await db.budget.findFirst({
    where: { userId, category: category as never },
  });
  if (!budget) throw AppError.notFound("budget", category);

  await db.budget.delete({ where: { id: budget.id } });

  await logActivity({
    userId,
    type: "AGENT_ACTION",
    actor,
    summary: `Removed the ${category} spending target`,
    metadata: { category },
  });

  return { category };
}

function toExpenseLite(e: {
  id: string;
  amount: unknown;
  category: string;
  date: Date;
}): ExpenseLite {
  return {
    id: e.id,
    amount: Number(e.amount),
    category: e.category,
    date: e.date,
  };
}

export async function analyzeSpendingForUser(
  userId: string,
  startDate?: string,
  endDate?: string,
) {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate
    ? new Date(startDate)
    : new Date(end.getFullYear(), end.getMonth(), 1); // default: month-to-date

  const periodLengthMs = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - periodLengthMs);

  const [current, previous, budgets] = await Promise.all([
    db.expense.findMany({ where: { userId, date: { gte: start, lte: end } } }),
    db.expense.findMany({
      where: { userId, date: { gte: previousStart, lte: previousEnd } },
    }),
    db.budget.findMany({ where: { userId } }),
  ]);

  const budgetLites: BudgetLite[] = budgets.map((b) => ({
    category: b.category,
    monthlyLimit: Number(b.monthlyLimit),
  }));

  return {
    period: { start: start.toISOString(), end: end.toISOString() },
    ...analyzeSpending(
      current.map(toExpenseLite),
      previous.map(toExpenseLite),
      budgetLites,
    ),
  };
}
