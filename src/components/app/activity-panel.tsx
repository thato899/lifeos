"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Bot, User, Cog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRelativeTime } from "@/lib/format";
import { onToolCall } from "@/components/webmcp/webmcp-events";
import {
  approveRequestAction,
  rejectRequestAction,
} from "@/lib/actions/approvals";
import { toast } from "sonner";

interface ActivityEventRow {
  id: string;
  type: string;
  actor: "human" | "agent" | "system";
  summary: string;
  toolName: string | null;
  requiresApproval: boolean;
  createdAt: string;
  approvalRequest: { id: string; status: string; summary: string } | null;
}

const ACTOR_ICON: Record<
  ActivityEventRow["actor"],
  React.ComponentType<{ className?: string }>
> = {
  agent: Bot,
  human: User,
  system: Cog,
};

/**
 * The Agent Activity panel (spec section 15) — the single place a human can
 * see every action LifeOS has taken, whether triggered by them or by an
 * agent through WebMCP, including anything still waiting on their approval.
 * Polls /api/activity (the durable source of truth) and also listens to the
 * local tool-call bus for instant feedback in the tab that made the call.
 */
export function ActivityPanel() {
  const [events, setEvents] = useState<ActivityEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const res = await fetch("/api/activity");
      const { events } = await res.json();
      setEvents(events);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const interval = setInterval(refresh, 4000);
    const unsubscribe = onToolCall(() => {
      // Give the write a moment to land, then refresh.
      setTimeout(refresh, 300);
    });
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  async function handleApprove(id: string) {
    const result = await approveRequestAction(id);
    if (result.success) {
      toast.success("Approved — change applied.");
    } else {
      toast.error(result.error.message);
    }
    void refresh();
  }

  async function handleReject(id: string) {
    const result = await rejectRequestAction(id);
    if (result.success) {
      toast("Rejected.");
    } else {
      toast.error(result.error.message);
    }
    void refresh();
  }

  const pendingApprovals = events.filter(
    (e) => e.approvalRequest?.status === "pending",
  );

  if (loading) {
    return (
      <div className="text-muted-foreground p-4 text-sm">Loading activity…</div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-sm">
        <Bot className="size-8 opacity-40" />
        <p>No activity yet. Actions you or an agent take will show up here.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-4">
        {pendingApprovals.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            {pendingApprovals.map((e) => (
              <div
                key={e.id}
                className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3"
              >
                <div className="flex items-start gap-2">
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Needs your approval</p>
                    <p className="text-muted-foreground text-sm">
                      {e.approvalRequest?.summary}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(e.approvalRequest!.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(e.approvalRequest!.id)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {events.map((event) => {
          const Icon = ACTOR_ICON[event.actor];
          const isPendingApproval = event.approvalRequest?.status === "pending";
          return (
            <div
              key={event.id}
              className="flex items-start gap-2.5 rounded-md px-2 py-2 text-sm"
            >
              {isPendingApproval ? (
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
              ) : (
                <CheckCircle2 className="text-muted-foreground/60 mt-0.5 size-4 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="leading-snug">{event.summary}</p>
                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                  <Icon className="size-3" />
                  <span className="capitalize">{event.actor}</span>
                  {event.toolName && (
                    <Badge
                      variant="secondary"
                      className="h-4 px-1.5 font-mono text-[10px]"
                    >
                      {event.toolName}
                    </Badge>
                  )}
                  <span>·</span>
                  <span>{formatRelativeTime(event.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
