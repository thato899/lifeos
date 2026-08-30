"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WebmcpContext, type WebmcpState } from "./webmcp-context";
import { emitToolCall } from "./webmcp-events";
import type { PublicToolMetadata } from "@/webmcp/public-tools";

/**
 * The client half of LifeOS's WebMCP integration. Everything here is thin
 * on purpose: it fetches the tool list the server already decided to
 * expose, registers each one with document.modelContext.registerTool(),
 * and forwards every call straight to POST /api/mcp/execute — which is
 * where validation, auth, risk-gating, and persistence actually happen
 * (src/webmcp/execute.ts). This component makes zero authorization
 * decisions of its own; see docs/security.md.
 */
export function WebmcpProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WebmcpState>({
    status: "loading",
    toolCount: 0,
  });
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function register() {
      if (
        typeof document === "undefined" ||
        !("modelContext" in document) ||
        !document.modelContext
      ) {
        setState({ status: "unsupported", toolCount: 0 });
        return;
      }
      const modelContext = document.modelContext;

      try {
        const res = await fetch("/api/mcp/tools");
        if (!res.ok)
          throw new Error(`Failed to load tool list (${res.status})`);
        const { tools }: { tools: PublicToolMetadata[] } = await res.json();
        if (cancelled) return;

        for (const tool of tools) {
          await modelContext!.registerTool(
            {
              name: tool.name,
              title: tool.title,
              description: tool.description,
              inputSchema: tool.inputSchema,
              annotations: tool.annotations,
              execute: async (input) => {
                let payload: {
                  success: boolean;
                  error?: { code: string; message: string };
                  data?: unknown;
                };
                try {
                  const response = await fetch("/api/mcp/execute", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tool: tool.name, input }),
                  });
                  payload = await response.json();
                } catch {
                  // Network failure talking to our own backend. Resolve
                  // with a structured error rather than throwing — a
                  // rejected promise currently surfaces to the agent as a
                  // bare UnknownError with no message (see spec section
                  // "Error Handling"), which is strictly worse for the
                  // agent than a readable JSON error it can act on.
                  payload = {
                    success: false,
                    error: {
                      code: "NETWORK_ERROR",
                      message: "Could not reach LifeOS. Please try again.",
                    },
                  };
                }

                const approvalRequired = Boolean(
                  payload.success &&
                  (payload.data as { approvalRequired?: boolean } | undefined)
                    ?.approvalRequired,
                );

                emitToolCall({
                  toolName: tool.name,
                  input,
                  success: payload.success,
                  approvalRequired,
                  timestamp: Date.now(),
                  errorMessage: payload.error?.message,
                });

                // Refresh server-rendered data so a manual UI action and an
                // agent action look identical to the human — the page just
                // updates. Read tools don't change anything, so skip it.
                if (tool.riskLevel !== "read") {
                  router.refresh();
                }

                return payload;
              },
            },
            { signal: controller.signal },
          );
        }

        if (!cancelled) setState({ status: "ready", toolCount: tools.length });
      } catch (error) {
        console.error("WebMCP tool registration failed:", error);
        if (!cancelled) setState({ status: "error", toolCount: 0 });
      }
    }

    void register();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [router]);

  return (
    <WebmcpContext.Provider value={state}>{children}</WebmcpContext.Provider>
  );
}
