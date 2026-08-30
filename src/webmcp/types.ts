import type { z } from "zod";
import type { Actor } from "@/lib/activity/log";

/**
 * The three-tier risk classification from spec section 16:
 *  - "read": never mutates state, safe to call without confirmation.
 *  - "low_write": mutates state but is small/reversible; executes directly
 *    and is logged, so the human can always see (and undo) what happened.
 *  - "high_write": impactful and harder to reverse (deletes, bulk schedule
 *    changes, financial targets). Never executes on the first call — it
 *    creates an ApprovalRequest instead, and only runs after a human
 *    explicitly approves it. See docs/webmcp.md "Human control".
 */
export type RiskLevel = "read" | "low_write" | "high_write";

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  riskLevel: RiskLevel;
  /** Tool output includes user-authored free text (titles, notes, descriptions). */
  untrustedOutput: boolean;
  /** One-line human-readable summary of this exact call, used for the activity log / approval prompt. */
  summarize: (input: TInput) => string;
  execute: (userId: string, input: TInput, actor: Actor) => Promise<TOutput>;
}

export function defineTool<TInput, TOutput>(
  def: ToolDefinition<TInput, TOutput>,
): ToolDefinition<TInput, TOutput> {
  return def;
}
