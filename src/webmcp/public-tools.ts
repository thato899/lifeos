import { z } from "zod";
import { ALL_TOOLS } from "./registry";

export interface PublicToolMetadata {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  riskLevel: "read" | "low_write" | "high_write";
  annotations: {
    readOnlyHint: boolean;
    untrustedContentHint: boolean;
  };
}

/**
 * What the browser fetches to know which tools to register with
 * document.modelContext.registerTool(). Never includes `execute` — that
 * stays server-side; the client's own execute() is a thin fetch() wrapper
 * (see src/webmcp/client.tsx) that calls back into /api/mcp/execute, which
 * re-validates and re-authorizes on every call. See docs/webmcp.md
 * "How WebMCP is implemented".
 */
export function getPublicToolMetadata(): PublicToolMetadata[] {
  return ALL_TOOLS.map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: z.toJSONSchema(tool.inputSchema as z.ZodType, {
      target: "draft-7",
    }),
    riskLevel: tool.riskLevel,
    annotations: {
      readOnlyHint: tool.riskLevel === "read",
      untrustedContentHint: tool.untrustedOutput,
    },
  }));
}
