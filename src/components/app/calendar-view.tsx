"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createScheduleBlockAction,
  deleteScheduleBlockAction,
} from "@/lib/actions/schedule";
import {
  applyPlanAction,
  planMyDayAction,
  planMyWeekAction,
} from "@/lib/actions/planning";
import { formatDateLabel, formatTimeLabel } from "@/lib/format";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import type { PlanBlockInput } from "@/services/schedule.service";

interface ScheduleBlockRow {
  id: string;
  title: string;
  start: string;
  end: string;
  category: string | null;
  taskId: string | null;
}

interface ProposedBlockRow {
  taskId: string;
  title: string;
  start: Date;
  end: Date;
  estimatedMinutes: number;
}

export function CalendarView({
  weekStartIso,
  blocks,
  availableTasks,
}: {
  weekStartIso: string;
  blocks: ScheduleBlockRow[];
  availableTasks: { id: string; title: string }[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [proposal, setProposal] = useState<{
    blocks: ProposedBlockRow[];
    unscheduled: { title: string; reason: string }[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const weekStart = new Date(weekStartIso);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  function blocksForDay(day: Date) {
    return blocks
      .filter((b) => new Date(b.start).toDateString() === day.toDateString())
      .sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
  }

  function removeBlock(id: string) {
    startTransition(async () => {
      const result = await deleteScheduleBlockAction(id);
      if (!result.success) toast.error(result.error.message);
    });
  }

  function runPlanDay() {
    startTransition(async () => {
      const today = new Date().toISOString().slice(0, 10);
      const result = await planMyDayAction(today);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      const plan = result.data as {
        proposedBlocks: ProposedBlockRow[];
        unscheduledTasks: { title: string; reason: string }[];
      };
      setProposal({
        blocks: plan.proposedBlocks,
        unscheduled: plan.unscheduledTasks,
      });
      setPlanOpen(true);
    });
  }

  function runPlanWeek() {
    startTransition(async () => {
      const result = await planMyWeekAction(weekStartIso.slice(0, 10));
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      const plan = result.data as {
        days: { proposedBlocks: ProposedBlockRow[] }[];
        tasksThatDontFit: { title: string; reason: string }[];
      };
      setProposal({
        blocks: plan.days.flatMap((d) => d.proposedBlocks),
        unscheduled: plan.tasksThatDontFit,
      });
      setPlanOpen(true);
    });
  }

  function applyProposal() {
    if (!proposal) return;
    startTransition(async () => {
      const input: PlanBlockInput[] = proposal.blocks.map((b) => ({
        taskId: b.taskId,
        title: b.title,
        start: new Date(b.start).toISOString(),
        end: new Date(b.end).toISOString(),
      }));
      const result = await applyPlanAction(input);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(
        `Scheduled ${(result.data as { scheduledCount: number }).scheduledCount} task(s).`,
      );
      setPlanOpen(false);
      setProposal(null);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={runPlanDay}
            disabled={isPending}
          >
            <Sparkles className="size-4" />
            Plan my day
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={runPlanWeek}
            disabled={isPending}
          >
            <Sparkles className="size-4" />
            Plan my week
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" />
                Add block
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form
                action={(formData) =>
                  startTransition(async () => {
                    const taskId = formData.get("taskId");
                    const result = await createScheduleBlockAction({
                      title: formData.get("title"),
                      start: new Date(
                        String(formData.get("start")),
                      ).toISOString(),
                      end: new Date(String(formData.get("end"))).toISOString(),
                      taskId: taskId && taskId !== "none" ? taskId : undefined,
                    });
                    if (!result.success) {
                      toast.error(result.error.message);
                      return;
                    }
                    toast.success("Added to calendar.");
                    setAddOpen(false);
                  })
                }
                className="flex flex-col gap-4"
              >
                <DialogHeader>
                  <DialogTitle>Add to calendar</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="block-title">Title</Label>
                  <Input id="block-title" name="title" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="start">Start</Label>
                    <Input
                      id="start"
                      name="start"
                      type="datetime-local"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="end">End</Label>
                    <Input id="end" name="end" type="datetime-local" required />
                  </div>
                </div>
                {availableTasks.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="taskId">Link to task (optional)</Label>
                    <Select name="taskId" defaultValue="none">
                      <SelectTrigger id="taskId">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {availableTasks.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                    Add
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {days.map((day) => (
          <div key={day.toISOString()} className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {formatDateLabel(day)}
            </p>
            <div className="flex flex-col gap-1.5">
              {blocksForDay(day).length === 0 && (
                <p className="text-muted-foreground text-xs">—</p>
              )}
              {blocksForDay(day).map((block) => (
                <div
                  key={block.id}
                  className="group flex items-start justify-between gap-1 rounded-md border px-2 py-1.5 text-xs"
                >
                  <div>
                    <p className="font-medium">{block.title}</p>
                    <p className="text-muted-foreground">
                      {formatTimeLabel(block.start)} –{" "}
                      {formatTimeLabel(block.end)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeBlock(block.id)}
                    className="text-muted-foreground opacity-0 group-hover:opacity-100"
                    aria-label={`Remove ${block.title}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Proposed plan</DialogTitle>
            <DialogDescription>
              LifeOS ranked your open tasks and fit them into your available
              time. Nothing is scheduled until you apply it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {proposal?.blocks.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Nothing to schedule.
              </p>
            )}
            {proposal?.blocks.map((b, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{b.title}</span>
                <span className="text-muted-foreground text-xs">
                  {formatDateLabel(b.start)} {formatTimeLabel(b.start)}–
                  {formatTimeLabel(b.end)}
                </span>
              </div>
            ))}
            {proposal && proposal.unscheduled.length > 0 && (
              <div className="mt-2">
                <p className="text-muted-foreground text-xs font-medium">
                  Couldn&apos;t fit:
                </p>
                {proposal.unscheduled.map((u, i) => (
                  <p key={i} className="text-muted-foreground text-xs">
                    {u.title} — {u.reason}
                  </p>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>
              Discard
            </Button>
            <Button
              onClick={applyProposal}
              disabled={isPending || !proposal?.blocks.length}
            >
              Apply plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
