"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPENSE_CATEGORIES } from "@/lib/validation/expense";
import { recordExpenseAction, setBudgetAction } from "@/lib/actions/expenses";
import { formatCurrency, formatDateLabel } from "@/lib/format";
import type { SpendingAnalysis } from "@/lib/planning/spending";

interface ExpenseRow {
  id: string;
  amount: number;
  category: string;
  date: string;
  description: string | null;
}

export function ExpensesView({
  expenses,
  budgets,
  analysis,
  openCreateOnLoad,
}: {
  expenses: ExpenseRow[];
  budgets: { category: string; monthlyLimit: number }[];
  analysis: SpendingAnalysis & { period: { start: string; end: string } };
  openCreateOnLoad?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(openCreateOnLoad));
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
        <div className="flex gap-2">
          <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Set budget</Button>
            </DialogTrigger>
            <DialogContent>
              <form
                action={(formData) =>
                  startTransition(async () => {
                    const result = await setBudgetAction(formData);
                    if (!result.success) {
                      toast.error(result.error.message);
                      return;
                    }
                    toast.success("Budget updated.");
                    setBudgetOpen(false);
                  })
                }
                className="flex flex-col gap-4"
              >
                <DialogHeader>
                  <DialogTitle>Set a monthly budget</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="budget-category">Category</Label>
                  <Select name="category" defaultValue={EXPENSE_CATEGORIES[0]}>
                    <SelectTrigger id="budget-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="monthlyLimit">Monthly limit</Label>
                  <Input
                    id="monthlyLimit"
                    name="monthlyLimit"
                    type="number"
                    min={1}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5">
                <Plus className="size-4" />
                Add expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form
                action={(formData) =>
                  startTransition(async () => {
                    const result = await recordExpenseAction(formData);
                    if (!result.success) {
                      toast.error(result.error.message);
                      return;
                    }
                    toast.success("Expense recorded.");
                    setOpen(false);
                  })
                }
                className="flex flex-col gap-4"
              >
                <DialogHeader>
                  <DialogTitle>Record an expense</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      min={0.01}
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="expense-category">Category</Label>
                    <Select
                      name="category"
                      defaultValue={EXPENSE_CATEGORIES[0]}
                    >
                      <SelectTrigger id="expense-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c} className="capitalize">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="description">Note</Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="optional"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                    Record
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="gap-1 py-4">
          <CardContent className="px-4">
            <p className="text-2xl font-semibold">
              {formatCurrency(analysis.totalSpending)}
            </p>
            <p className="text-muted-foreground text-xs">Spent this month</p>
          </CardContent>
        </Card>
        <Card className="gap-1 py-4">
          <CardContent className="px-4">
            <p className="text-2xl font-semibold">
              {analysis.topCategory?.category ?? "—"}
            </p>
            <p className="text-muted-foreground text-xs">Top category</p>
          </CardContent>
        </Card>
        <Card className="gap-1 py-4">
          <CardContent className="px-4">
            <p className="text-2xl font-semibold">
              {analysis.unusualIncreases.length}
            </p>
            <p className="text-muted-foreground text-xs">Unusual increases</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By category</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {analysis.categoryTotals.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No spending recorded yet.
              </p>
            )}
            {analysis.categoryTotals.map((c) => (
              <div key={c.category} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">{c.category}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(c.total)}
                  </span>
                </div>
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-foreground h-full rounded-full"
                    style={{ width: `${c.percentageOfTotal}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card data-testid="budget-vs-actual">
          <CardHeader>
            <CardTitle>Budget vs. actual</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {budgets.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No budgets set yet.
              </p>
            )}
            {analysis.budgetVariance.map((b) => (
              <div key={b.category} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">{b.category}</span>
                  <span
                    className={
                      b.variance > 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }
                  >
                    {formatCurrency(b.actual)} / {formatCurrency(b.budget)}
                  </span>
                </div>
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className={
                      b.percentUsed > 100
                        ? "bg-destructive h-full rounded-full"
                        : "bg-foreground h-full rounded-full"
                    }
                    style={{ width: `${Math.min(100, b.percentUsed)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent expenses</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {expenses.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No expenses recorded yet.
            </p>
          )}
          {expenses.slice(0, 10).map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between text-sm"
            >
              <div>
                <span className="capitalize">{e.category}</span>
                {e.description && (
                  <span className="text-muted-foreground">
                    {" "}
                    — {e.description}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-xs">
                  {formatDateLabel(e.date)}
                </span>
                <span className="font-medium">{formatCurrency(e.amount)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
