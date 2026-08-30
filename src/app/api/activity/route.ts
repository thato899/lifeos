import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-scope";
import { listRecentActivity } from "@/lib/activity/log";

/** Polled by the Agent Activity panel so it updates live as tool calls happen. */
export async function GET() {
  try {
    const userId = await requireUserId();
    const events = await listRecentActivity(userId, 40);
    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ events: [] }, { status: 401 });
  }
}
