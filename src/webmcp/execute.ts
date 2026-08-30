import { logActivity } from "@/lib/activity/log";
import {
  AppError,
  errorToServiceResult,
  toServiceResult,
  type ServiceResult,
} from "@/lib/errors/app-error";
import { createApprovalRequest } from "@/services/approval.service";
import { getTool } from "./registry";

export interface ToolCallResult {
  toolName: string;
  result: ServiceResult<unknown>;
}

/**
 * The one function every WebMCP tool call goes through server-side (invoked
 * by /api/mcp/execute, which the browser's registered tools call via
 * fetch()). This is where risk-level gating actually happens — client code
 * never decides whether a call requires approval; this function does, every
 * time, regardless of what the browser sends.
 */
export async function executeTool(
  userId: string,
  name: string,
  rawInput: unknown,
): Promise<ToolCallResult> {
  const tool = getTool(name);
  if (!tool) {
    return {
      toolName: name,
      result: errorToServiceResult(
        new AppError("TOOL_NOT_FOUND", `No tool named "${name}".`),
      ),
    };
  }

  const parsed = tool.inputSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".") || "input"}: ${i.message}`)
      .join("; ");
    return {
      toolName: name,
      result: errorToServiceResult(AppError.validation(message)),
    };
  }

  try {
    if (tool.riskLevel === "high_write") {
      const summary = tool.summarize(parsed.data);
      const approval = await createApprovalRequest({
        userId,
        actionType: tool.name,
        summary,
        payload: parsed.data as never,
      });
      return {
        toolName: name,
        result: toServiceResult({
          approvalRequired: true,
          approvalId: approval.id,
          summary,
          message: `This action needs your approval before it happens: ${summary}`,
        }),
      };
    }

    const data = await tool.execute(userId, parsed.data, "agent");

    if (tool.riskLevel === "read") {
      // Low/high-write tools log through their own service functions
      // (task.service, schedule.service, etc.) so the log entry carries the
      // richer domain-specific event type. Reads have no domain event, so
      // the dispatcher logs them here as the generic AGENT_ACTION.
      await logActivity({
        userId,
        type: "AGENT_ACTION",
        actor: "agent",
        summary: tool.summarize(parsed.data),
        toolName: tool.name,
      });
    }

    return { toolName: name, result: toServiceResult(data) };
  } catch (error) {
    return { toolName: name, result: errorToServiceResult(error) };
  }
}
