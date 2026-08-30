"use client";

/**
 * A tiny client-side event bus so any component (Agent Activity panel, Tool
 * Inspector, dashboard) can react the instant a WebMCP tool runs, without
 * prop-drilling through the whole app. This is a UX convenience only — the
 * durable source of truth is always the ActivityEvent table in Postgres
 * (fetched via /api/activity); this bus just avoids a polling delay for the
 * tab that actually triggered the call.
 */
export interface ToolCallEvent {
  toolName: string;
  input: unknown;
  success: boolean;
  approvalRequired: boolean;
  timestamp: number;
  errorMessage?: string;
}

const target = new EventTarget();
const EVENT_NAME = "lifeos:tool-call";

export function emitToolCall(event: ToolCallEvent) {
  target.dispatchEvent(
    new CustomEvent<ToolCallEvent>(EVENT_NAME, { detail: event }),
  );
}

export function onToolCall(
  handler: (event: ToolCallEvent) => void,
): () => void {
  const listener = (e: Event) =>
    handler((e as CustomEvent<ToolCallEvent>).detail);
  target.addEventListener(EVENT_NAME, listener);
  return () => target.removeEventListener(EVENT_NAME, listener);
}
