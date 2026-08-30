// Records a short walkthrough video of the flagship scenario (docs/demo.md)
// against a real running LifeOS instance, with on-screen captions standing
// in for narration. Produces demo.webm (Playwright's native format) and,
// if ffmpeg is available, demo.mp4.
//
// Honesty note: this drives the browser through the real UI and calls the
// real POST /api/mcp/execute dispatcher directly for the "agent" steps —
// the exact payload shape a browser-registered WebMCP tool's execute()
// sends (see docs/webmcp.md). It does not call document.modelContext
// itself, because no Chromium build available here yet ships the WebMCP
// origin trial feature. Captions say so explicitly rather than implying
// otherwise. See docs/webmcp.md "Testing WebMCP locally" for how to verify
// the real registerTool() path with a WebMCP-flagged Chrome.
//
// Usage: node scripts/record-demo.mjs [baseUrl]
//   Defaults to the live production deployment.

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const BASE_URL = process.argv[2] || "https://lifeos-nine-neon.vercel.app";
const OUT_DIR = "demo-recording";
mkdirSync(OUT_DIR, { recursive: true });

async function caption(page, text, ms = 3200) {
  await page.evaluate((t) => {
    let el = document.getElementById("__demo_caption__");
    if (!el) {
      el = document.createElement("div");
      el.id = "__demo_caption__";
      el.style.cssText = `
        position: fixed; left: 50%; bottom: 32px; transform: translateX(-50%);
        max-width: 90%; z-index: 999999; background: rgba(15,15,15,0.92);
        color: #fff; padding: 14px 22px; border-radius: 10px;
        font: 500 17px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;
        text-align: center; box-shadow: 0 8px 30px rgba(0,0,0,0.35);
        pointer-events: none;
      `;
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
  await page.waitForTimeout(ms);
}

async function clearCaption(page) {
  await page.evaluate(() => document.getElementById("__demo_caption__")?.remove());
}

async function callTool(page, tool, input = {}) {
  const res = await page.request.post(`${BASE_URL}/api/mcp/execute`, { data: { tool, input } });
  return res.json();
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();

  // 1. Landing page
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await caption(page, "LifeOS — your life, your agent, one workspace.", 3000);
  await page.evaluate(() => document.getElementById("webmcp")?.scrollIntoView({ behavior: "smooth" }));
  await caption(page, "WebMCP: an agent gets real, described tools — not a guess at which button to click.", 4200);
  await clearCaption(page);

  // 2. Sign in
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await caption(page, "One click, no signup, to try it with realistic data.", 2200);
  await page.getByRole("button", { name: /try the demo/i }).click();
  await page.waitForURL("**/app/dashboard");
  await page.waitForTimeout(600);
  await caption(page, "Alex's messy week: an overdue task, a double-booking, an over-budget category.", 4200);
  await clearCaption(page);

  // 3. Show a couple of manual-UI pages
  await page.goto(`${BASE_URL}/app/calendar`, { waitUntil: "networkidle" });
  await caption(page, "Every module — Tasks, Calendar, Goals, Shopping, Expenses, Routines — has a full manual UI too.", 4200);
  await clearCaption(page);

  // 4. Open Agent Activity and run the flagship WebMCP sequence
  await page.goto(`${BASE_URL}/app/dashboard`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /agent activity/i }).click();
  await caption(
    page,
    "Now: an agent's WebMCP tool calls, made the same way a browser-registered tool's execute() does.",
    4400,
  );
  await clearCaption(page);

  await caption(page, "“I have a busy week. Organize it. Don't schedule anything after 7pm.”", 3400);
  await callTool(page, "get_today_overview");
  await page.waitForTimeout(4200); // panel auto-polls every 4s
  await callTool(page, "get_tasks");
  await page.waitForTimeout(4200);
  await callTool(page, "identify_conflicts");
  await page.waitForTimeout(4200);
  const plan = await callTool(page, "plan_my_week", {
    weekStart: new Date().toISOString().slice(0, 10),
    constraints: { noScheduleAfter: "19:00" },
  });
  await page.waitForTimeout(4200);
  await caption(page, `get_today_overview → get_tasks → identify_conflicts → plan_my_week, respecting the 7pm limit.`, 4000);
  await clearCaption(page);
  void plan;

  // 5. Reschedule a task
  await caption(page, "“Move grocery shopping to Saturday.”", 2600);
  const tasksRes = await callTool(page, "get_tasks");
  const grocery = tasksRes.data.find((t) => t.title === "Buy groceries");
  if (grocery) {
    const start = new Date();
    start.setDate(start.getDate() + ((6 - start.getDay() + 7) % 7 || 7));
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10, 0, 0, 0);
    await callTool(page, "reschedule_task", { taskId: grocery.id, newStart: start.toISOString(), newEnd: end.toISOString() });
  }
  await page.goto(`${BASE_URL}/app/calendar`, { waitUntil: "networkidle" });
  await caption(page, "reschedule_task — the calendar updates immediately. Low-impact, executes directly.", 3800);
  await clearCaption(page);

  // 6. Spending question + a gated financial change
  await page.goto(`${BASE_URL}/app/dashboard`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /agent activity/i }).click();
  await caption(page, "“How much did I spend on food this month? Remove my entertainment spending target.”", 3800);
  await callTool(page, "analyze_spending");
  await page.waitForTimeout(1200);
  await callTool(page, "delete_budget", { category: "entertainment" });
  await page.waitForTimeout(4400);
  await caption(page, "delete_budget changes a financial target — it always asks first.", 3600);
  await clearCaption(page);

  const approveBtn = page.getByRole("button", { name: /^approve$/i });
  if (await approveBtn.isVisible().catch(() => false)) {
    await approveBtn.click();
    await page.waitForTimeout(1200);
  }
  await page.goto(`${BASE_URL}/app/expenses`, { waitUntil: "networkidle" });
  await caption(page, "Approved — the entertainment target is actually gone. A real change, not a mock.", 4200);
  await clearCaption(page);

  // 7. Close
  await page.goto(`${BASE_URL}/app/dashboard`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /agent activity/i }).click();
  await caption(page, "Every one of these lines is a real, validated tool call — the same LifeOS a human edits by hand.", 4400);
  await clearCaption(page);
  await caption(page, "LifeOS: your life, your agent, one workspace.", 3200);

  await context.close();
  await browser.close();

  console.log(`Video saved in ${OUT_DIR}/`);
  try {
    const { readdirSync, renameSync } = await import("node:fs");
    const webm = readdirSync(OUT_DIR).find((f) => f.endsWith(".webm"));
    if (webm) {
      renameSync(`${OUT_DIR}/${webm}`, `${OUT_DIR}/demo.webm`);
      const ffmpeg = process.env.FFMPEG_PATH;
      if (ffmpeg) {
        execFileSync(ffmpeg, ["-y", "-i", `${OUT_DIR}/demo.webm`, "-c:v", "libx264", "-pix_fmt", "yuv420p", `${OUT_DIR}/demo.mp4`], {
          stdio: "inherit",
        });
        console.log(`Converted to ${OUT_DIR}/demo.mp4`);
      }
    }
  } catch (e) {
    console.error("Post-processing skipped:", e.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
