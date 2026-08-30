import { registerApprovalExecutor } from "@/services/approval.service";
import { expenseTools } from "./tools/expense";
import { goalTools } from "./tools/goal";
import { readTools } from "./tools/read";
import { routineTools } from "./tools/routine";
import { scheduleTools } from "./tools/schedule";
import { shoppingTools } from "./tools/shopping";
import { taskTools } from "./tools/task";
import { workflowTools } from "./tools/workflow";
import type { ToolDefinition } from "./types";

/**
 * The single WebMCP tool registry (spec section 17/18/19/20). Every tool
 * LifeOS exposes to an agent is defined once here and reused for three
 * things: (1) the public metadata served to the browser for
 * document.modelContext.registerTool, (2) server-side execution in
 * /api/mcp/execute, and (3) the approval executor a human's "approve" click
 * ultimately runs. There is deliberately no other path into these services
 * from an agent — see docs/security.md.
 */
// A heterogeneous registry necessarily erases each tool's specific input/
// output types — callers go through executeTool()/getTool(), which validate
// input with the tool's own zod schema at runtime, so nothing here bypasses
// type safety where it matters (the tool's own definition file).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ALL_TOOLS: ToolDefinition<any, unknown>[] = [
  ...readTools,
  ...taskTools,
  ...scheduleTools,
  ...goalTools,
  ...shoppingTools,
  ...expenseTools,
  ...routineTools,
  ...workflowTools,
];

const toolsByName = new Map(ALL_TOOLS.map((t) => [t.name, t]));

export function getTool(name: string) {
  return toolsByName.get(name);
}

// High-impact tools never execute inline — they create an ApprovalRequest
// and only run once approved. Register each one's real executor so
// approval.service can invoke it later without importing every domain
// service directly.
for (const tool of ALL_TOOLS) {
  if (tool.riskLevel === "high_write") {
    registerApprovalExecutor(tool.name, async (userId, payload) => {
      const input = tool.inputSchema.parse(payload);
      return tool.execute(userId, input, "agent");
    });
  }
}
