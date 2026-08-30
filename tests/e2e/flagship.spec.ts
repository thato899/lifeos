import { expect, test } from "@playwright/test";

/**
 * End-to-end coverage of the flagship human+agent loop (spec section 30),
 * driven through a real browser against a real running server and
 * Postgres — the level that caught two real bugs during development that
 * unit/integration tests (sharing one process) didn't (see
 * docs/architecture.md and docs/testing.md).
 *
 * This calls POST /api/mcp/execute directly with the same payload shape a
 * real `document.modelContext.registerTool()`-registered tool's execute()
 * sends. It does not call registerTool() itself, because no Chromium build
 * available in CI/this environment yet ships the WebMCP origin trial
 * feature — see docs/webmcp.md "Testing WebMCP locally" for the manual
 * verification step that requires a WebMCP-flagged Chrome.
 */

async function signInAsDemo(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /try the demo/i }).click();
  await page.waitForURL("**/app/dashboard");
}

test.describe("LifeOS flagship scenario", () => {
  test("dashboard renders the seeded demo data", async ({ page }) => {
    await signInAsDemo(page);
    await expect(page.getByText("Overdue").first()).toBeVisible();
    await expect(page.getByText("Submit project report").first()).toBeVisible();
  });

  test("the WebMCP dispatcher runs a full agent sequence and the UI reflects it", async ({
    page,
  }) => {
    await signInAsDemo(page);

    async function callTool(tool: string, input: Record<string, unknown> = {}) {
      const res = await page.request.post("/api/mcp/execute", {
        data: { tool, input },
      });
      expect(res.ok()).toBe(true);
      return res.json();
    }

    const overview = await callTool("get_today_overview");
    expect(overview.success).toBe(true);

    const tasks = await callTool("get_tasks");
    expect(tasks.success).toBe(true);
    expect(Array.isArray(tasks.data)).toBe(true);

    const conflicts = await callTool("identify_conflicts");
    expect(conflicts.success).toBe(true);

    const spending = await callTool("analyze_spending");
    expect(spending.success).toBe(true);
    expect(spending.data.totalSpending).toBeGreaterThan(0);

    // High-impact: must NOT execute immediately.
    const deleteBudget = await callTool("delete_budget", {
      category: "entertainment",
    });
    expect(deleteBudget.success).toBe(true);
    expect(deleteBudget.data.approvalRequired).toBe(true);
    const approvalId: string = deleteBudget.data.approvalId;

    // The pending approval should now be visible in the Agent Activity panel.
    await page.goto("/app/dashboard");
    await page.getByRole("button", { name: /agent activity/i }).click();
    await expect(page.getByText("Needs your approval")).toBeVisible();
    await expect(
      page.getByText(/remove the entertainment spending target/i).first(),
    ).toBeVisible();

    // Approving through the real UI should actually apply the change.
    await page.getByRole("button", { name: /^approve$/i }).click();
    await expect(page.getByText(/approved — change applied/i)).toBeVisible();

    // Verify against the API too, not just a toast.
    const approvals = await page.request.get("/api/activity");
    const events = (await approvals.json()).events as {
      type: string;
      approvalRequest: { id: string; status: string } | null;
    }[];
    const resolved = events.find((e) => e.approvalRequest?.id === approvalId);
    expect(resolved?.approvalRequest?.status).toBe("approved");

    // And the budget should actually be gone from the Expenses page —
    // scoped to the "Budget vs. actual" card specifically, since
    // "entertainment" still legitimately appears in the "By category"
    // spending breakdown (the expenses themselves aren't deleted, only
    // the target).
    await page.goto("/app/expenses");
    const budgetCard = page.getByTestId("budget-vs-actual");
    await expect(budgetCard).toBeVisible();
    await expect(budgetCard.getByText(/entertainment/i)).toHaveCount(0);
  });

  test("a single-task reschedule executes directly, no approval needed", async ({
    page,
  }) => {
    await signInAsDemo(page);

    const tasksRes = await page.request.post("/api/mcp/execute", {
      data: { tool: "get_tasks", input: {} },
    });
    const { data: tasks } = await tasksRes.json();
    const grocery = tasks.find(
      (t: { title: string }) => t.title === "Buy groceries",
    );
    expect(grocery).toBeTruthy();

    const newStart = new Date();
    newStart.setDate(newStart.getDate() + 6);
    newStart.setHours(9, 0, 0, 0);
    const newEnd = new Date(newStart);
    newEnd.setHours(10, 0, 0, 0);

    const rescheduleRes = await page.request.post("/api/mcp/execute", {
      data: {
        tool: "reschedule_task",
        input: {
          taskId: grocery.id,
          newStart: newStart.toISOString(),
          newEnd: newEnd.toISOString(),
        },
      },
    });
    const rescheduled = await rescheduleRes.json();
    expect(rescheduled.success).toBe(true);
    expect(rescheduled.data.approvalRequired).toBeUndefined(); // executed directly
  });
});
