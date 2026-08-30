import { describe, expect, it } from "vitest";
import { analyzeSpending, type ExpenseLite } from "./spending";

function expense(overrides: Partial<ExpenseLite>): ExpenseLite {
  return {
    id: "e1",
    amount: 100,
    category: "food",
    date: new Date("2026-08-15"),
    ...overrides,
  };
}

describe("analyzeSpending", () => {
  it("totals spending and ranks categories highest-first", () => {
    const result = analyzeSpending(
      [
        expense({ id: "1", category: "food", amount: 300 }),
        expense({ id: "2", category: "transport", amount: 100 }),
      ],
      [],
      [],
    );
    expect(result.totalSpending).toBe(400);
    expect(result.topCategory?.category).toBe("food");
    expect(result.categoryTotals[0].percentageOfTotal).toBe(75);
  });

  it("computes budget variance as actual minus budget", () => {
    const result = analyzeSpending(
      [expense({ category: "food", amount: 600 })],
      [],
      [{ category: "food", monthlyLimit: 500 }],
    );
    expect(result.budgetVariance[0].variance).toBe(100);
    expect(result.budgetVariance[0].percentUsed).toBe(120);
  });

  it("flags a category as an unusual increase only above the 40% threshold", () => {
    const current = [expense({ category: "entertainment", amount: 200 })];
    const previousBig = [expense({ category: "entertainment", amount: 100 })]; // +100%
    const previousSmall = [expense({ category: "entertainment", amount: 190 })]; // ~5%

    const flagged = analyzeSpending(current, previousBig, []);
    expect(
      flagged.unusualIncreases.some((u) => u.category === "entertainment"),
    ).toBe(true);

    const notFlagged = analyzeSpending(current, previousSmall, []);
    expect(
      notFlagged.unusualIncreases.some((u) => u.category === "entertainment"),
    ).toBe(false);
  });

  it("returns an empty analysis for no expenses", () => {
    const result = analyzeSpending([], [], []);
    expect(result.totalSpending).toBe(0);
    expect(result.topCategory).toBeNull();
  });
});
