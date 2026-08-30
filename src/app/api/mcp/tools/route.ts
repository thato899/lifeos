import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-scope";
import { getPublicToolMetadata } from "@/webmcp/public-tools";

/**
 * Served to the browser on load so it knows which tools to register with
 * document.modelContext.registerTool(). Requires a signed-in session —
 * tool *availability* is itself something we don't hand out to anonymous
 * requests, even though the metadata contains no user data.
 */
export async function GET() {
  try {
    await requireUserId();
  } catch {
    return NextResponse.json({ tools: [] }, { status: 401 });
  }

  return NextResponse.json({ tools: getPublicToolMetadata() });
}
