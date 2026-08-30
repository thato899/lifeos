import { NextResponse } from "next/server";
import { requireUserId, UnauthenticatedError } from "@/lib/auth-scope";
import { checkRateLimit } from "@/lib/rate-limit";
import { executeTool } from "@/webmcp/execute";

const MAX_BODY_TOOL_NAME_LENGTH = 100;

/**
 * The single dispatcher every registered WebMCP tool's client-side execute()
 * calls (see src/webmcp/client.tsx). This is the real authorization and
 * validation boundary — see docs/security.md. Every request is:
 *   1. re-authenticated from the session cookie (never a client-sent userId)
 *   2. rate-limited per user
 *   3. matched against the server-side tool registry by name
 *   4. validated against that tool's own zod schema
 *   5. gated by risk level (high-impact tools never execute inline)
 *   6. logged to the activity feed
 * A malicious or buggy page script cannot get more access than this allows,
 * because there is no other entry point into the service layer for an
 * agent — see src/webmcp/registry.ts.
 */
export async function POST(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHENTICATED", message: error.message },
        },
        { status: 401 },
      );
    }
    throw error;
  }

  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many tool calls in a short period. Please slow down.",
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((rateLimit.retryAfterMs ?? 1000) / 1000),
          ),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Request body must be JSON.",
        },
      },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("tool" in body) ||
    typeof (body as { tool: unknown }).tool !== "string" ||
    (body as { tool: string }).tool.length > MAX_BODY_TOOL_NAME_LENGTH
  ) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Request must include a `tool` name.",
        },
      },
      { status: 400 },
    );
  }

  const { tool, input } = body as { tool: string; input?: unknown };
  const { result } = await executeTool(userId, tool, input);

  return NextResponse.json(result);
}
