"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth-scope";
import { errorToServiceResult, toServiceResult } from "@/lib/errors/app-error";
import { recordExpenseSchema, setBudgetSchema } from "@/lib/validation/expense";
import * as expenseService from "@/services/expense.service";

export async function recordExpenseAction(formData: FormData) {
  try {
    const userId = await requireUserId();
    const input = recordExpenseSchema.parse({
      amount: Number(formData.get("amount")),
      category: formData.get("category"),
      date: new Date(
        String(formData.get("date") || new Date().toISOString()),
      ).toISOString(),
      description: formData.get("description") || undefined,
    });
    const expense = await expenseService.recordExpense(userId, input, "human");
    revalidatePath("/app");
    return toServiceResult(expense);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

// A human setting their own budget in Settings is not gated by the
// agent-approval system (see docs/security.md) — they can just do it.
export async function setBudgetAction(formData: FormData) {
  try {
    const userId = await requireUserId();
    const input = setBudgetSchema.parse({
      category: formData.get("category"),
      monthlyLimit: Number(formData.get("monthlyLimit")),
    });
    const budget = await expenseService.setBudget(userId, input, "human");
    revalidatePath("/app");
    return toServiceResult(budget);
  } catch (error) {
    return errorToServiceResult(error);
  }
}

export async function deleteBudgetAction(category: string) {
  try {
    const userId = await requireUserId();
    const result = await expenseService.deleteBudget(userId, category, "human");
    revalidatePath("/app");
    return toServiceResult(result);
  } catch (error) {
    return errorToServiceResult(error);
  }
}
