"use client";

import { useWebmcpStatus } from "./webmcp-context";
import { cn } from "@/lib/utils";

const LABEL: Record<string, string> = {
  loading: "Checking…",
  ready: "Available",
  unsupported: "Not supported here",
  error: "Registration failed",
};

const DOT: Record<string, string> = {
  loading: "bg-muted-foreground/40",
  ready: "bg-emerald-500",
  unsupported: "bg-muted-foreground/40",
  error: "bg-destructive",
};

/**
 * The "agent-ready" indicator from spec section 31 — makes WebMCP's
 * presence visible rather than an invisible implementation detail. Reflects
 * the real registration outcome (see WebmcpProvider), never a hardcoded
 * "connected" badge.
 */
export function WebmcpStatusPill() {
  const { status, toolCount } = useWebmcpStatus();

  return (
    <div className="flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs">
      <span className={cn("size-1.5 rounded-full", DOT[status])} aria-hidden />
      <span className="text-muted-foreground">WebMCP</span>
      <span className="font-medium">{LABEL[status]}</span>
      {status === "ready" && (
        <>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{toolCount} tools</span>
        </>
      )}
    </div>
  );
}
