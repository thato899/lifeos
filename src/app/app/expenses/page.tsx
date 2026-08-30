import { requireUserId } from "@/lib/auth-scope";
import {
  analyzeSpendingForUser,
  listBudgets,
  listExpenses,
} from "@/services/expense.service";
import { ExpensesView } from "@/components/app/expenses-view";

export default async function ExpensesPage({
  searchParams,
}: PageProps<"/app/expenses">) {
  const userId = await requireUserId();
  const [expenses, budgets, analysis] = await Promise.all([
    listExpenses(userId),
    listBudgets(userId),
    analyzeSpendingForUser(userId),
  ]);
  const params = await searchParams;

  return (
    <ExpensesView
      expenses={expenses.map((e) => ({
        id: e.id,
        amount: Number(e.amount),
        category: e.category,
        date: e.date.toISOString(),
        description: e.description,
      }))}
      budgets={budgets.map((b) => ({
        category: b.category,
        monthlyLimit: Number(b.monthlyLimit),
      }))}
      analysis={analysis}
      openCreateOnLoad={params.new === "1"}
    />
  );
}
