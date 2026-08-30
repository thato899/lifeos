export interface ExpenseLite {
  id: string;
  amount: number;
  category: string;
  date: Date;
}

export interface BudgetLite {
  category: string;
  monthlyLimit: number;
}

export interface CategoryTotal {
  category: string;
  total: number;
  percentageOfTotal: number;
  transactionCount: number;
}

export interface BudgetVariance {
  category: string;
  budget: number;
  actual: number;
  variance: number; // actual - budget; positive means over budget
  percentUsed: number;
}

export interface SpendingAnalysis {
  totalSpending: number;
  categoryTotals: CategoryTotal[];
  topCategory: CategoryTotal | null;
  budgetVariance: BudgetVariance[];
  unusualIncreases: {
    category: string;
    current: number;
    previous: number;
    increasePercent: number;
  }[];
}

function sumByCategory(
  expenses: ExpenseLite[],
): Map<string, { total: number; count: number }> {
  const map = new Map<string, { total: number; count: number }>();
  for (const e of expenses) {
    const entry = map.get(e.category) ?? { total: 0, count: 0 };
    entry.total += e.amount;
    entry.count += 1;
    map.set(e.category, entry);
  }
  return map;
}

/**
 * LifeOS's spending-analysis heuristic. Aggregates expenses in the given
 * period by category, compares to any budgets the user has set, and flags a
 * category as an "unusual increase" when it rose more than 40% versus the
 * equal-length period immediately before — a simple period-over-period
 * comparison, not a statistical anomaly model.
 */
export function analyzeSpending(
  currentPeriodExpenses: ExpenseLite[],
  previousPeriodExpenses: ExpenseLite[],
  budgets: BudgetLite[],
): SpendingAnalysis {
  const totalSpending = currentPeriodExpenses.reduce(
    (sum, e) => sum + e.amount,
    0,
  );
  const byCategory = sumByCategory(currentPeriodExpenses);

  const categoryTotals: CategoryTotal[] = [...byCategory.entries()]
    .map(([category, { total, count }]) => ({
      category,
      total: Math.round(total * 100) / 100,
      percentageOfTotal:
        totalSpending > 0 ? Math.round((total / totalSpending) * 1000) / 10 : 0,
      transactionCount: count,
    }))
    .sort((a, b) => b.total - a.total);

  const topCategory = categoryTotals[0] ?? null;

  const budgetVariance: BudgetVariance[] = budgets.map((b) => {
    const actual = byCategory.get(b.category)?.total ?? 0;
    return {
      category: b.category,
      budget: b.monthlyLimit,
      actual: Math.round(actual * 100) / 100,
      variance: Math.round((actual - b.monthlyLimit) * 100) / 100,
      percentUsed:
        b.monthlyLimit > 0
          ? Math.round((actual / b.monthlyLimit) * 1000) / 10
          : 0,
    };
  });

  const previousByCategory = sumByCategory(previousPeriodExpenses);
  const unusualIncreases: SpendingAnalysis["unusualIncreases"] = [];
  for (const [category, { total: current }] of byCategory) {
    const previous = previousByCategory.get(category)?.total ?? 0;
    if (previous <= 0) continue; // no baseline to compare against
    const increasePercent = ((current - previous) / previous) * 100;
    if (increasePercent > 40) {
      unusualIncreases.push({
        category,
        current: Math.round(current * 100) / 100,
        previous: Math.round(previous * 100) / 100,
        increasePercent: Math.round(increasePercent),
      });
    }
  }
  unusualIncreases.sort((a, b) => b.increasePercent - a.increasePercent);

  return {
    totalSpending: Math.round(totalSpending * 100) / 100,
    categoryTotals,
    topCategory,
    budgetVariance,
    unusualIncreases,
  };
}
