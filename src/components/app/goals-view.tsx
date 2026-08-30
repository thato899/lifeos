"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  createActionPlanAction,
  createGoalAction,
  updateGoalProgressAction,
} from "@/lib/actions/goals";
import { formatDateLabel } from "@/lib/format";

interface GoalRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  progress: number;
  targetDate: string | null;
  milestones: { id: string; title: string; completed: boolean }[];
}

export function GoalsView({
  goals,
  openCreateOnLoad,
}: {
  goals: GoalRow[];
  openCreateOnLoad?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(openCreateOnLoad));
  const [isPending, startTransition] = useTransition();

  function bumpProgress(goalId: string, current: number) {
    startTransition(async () => {
      const result = await updateGoalProgressAction(
        goalId,
        Math.min(100, current + 10),
      );
      if (!result.success) toast.error(result.error.message);
    });
  }

  function makeActionPlan(goalId: string) {
    startTransition(async () => {
      const result = await createActionPlanAction(goalId);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      const { tasks } = result.data as { tasks: { id: string }[] };
      toast.success(`Created ${tasks.length} task(s) for this goal.`);
    });
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Plus className="size-4" />
              New goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form
              action={(formData) =>
                startTransition(async () => {
                  const result = await createGoalAction(formData);
                  if (!result.success) {
                    toast.error(result.error.message);
                    return;
                  }
                  toast.success("Goal created.");
                  setOpen(false);
                })
              }
              className="flex flex-col gap-4"
            >
              <DialogHeader>
                <DialogTitle>New goal</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="goal-title">Title</Label>
                <Input
                  id="goal-title"
                  name="title"
                  required
                  autoFocus
                  placeholder="e.g. Save R20,000"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="goal-description">Description</Label>
                <Textarea id="goal-description" name="description" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="targetDate">Target date</Label>
                  <Input id="targetDate" name="targetDate" type="date" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="goal-category">Category</Label>
                  <Input
                    id="goal-category"
                    name="category"
                    placeholder="e.g. finance"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  Create goal
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No goals yet — set one above.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {goals.map((g) => (
          <Card key={g.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{g.title}</CardTitle>
                <Badge variant="secondary" className="capitalize">
                  {g.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {g.description && (
                <p className="text-muted-foreground text-sm">{g.description}</p>
              )}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span>{g.progress}%</span>
                </div>
                <Progress value={g.progress} />
              </div>
              {g.targetDate && (
                <p className="text-muted-foreground text-xs">
                  Target: {formatDateLabel(g.targetDate)}
                </p>
              )}
              {g.milestones.length > 0 && (
                <ul className="flex flex-col gap-1 text-sm">
                  {g.milestones.map((m) => (
                    <li
                      key={m.id}
                      className={
                        m.completed ? "text-muted-foreground line-through" : ""
                      }
                    >
                      • {m.title}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-1 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => bumpProgress(g.id, g.progress)}
                  disabled={isPending}
                >
                  +10% progress
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => makeActionPlan(g.id)}
                  disabled={isPending}
                >
                  <Sparkles className="size-3.5" />
                  Action plan
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
