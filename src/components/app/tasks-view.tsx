"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PriorityBadge } from "./priority-badge";
import {
  completeTaskAction,
  createTaskAction,
  deleteTaskAction,
  reopenTaskAction,
} from "@/lib/actions/tasks";
import { formatDateLabel } from "@/lib/format";

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: Date | null;
  category: string | null;
  tags: string[];
}

const STATUS_FILTERS = [
  "all",
  "inbox",
  "planned",
  "in_progress",
  "completed",
] as const;

export function TasksView({
  tasks,
  openCreateOnLoad,
}: {
  tasks: TaskRow[];
  openCreateOnLoad?: boolean;
}) {
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [dialogOpen, setDialogOpen] = useState(Boolean(openCreateOnLoad));
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () => (filter === "all" ? tasks : tasks.filter((t) => t.status === filter)),
    [tasks, filter],
  );

  function toggle(task: TaskRow) {
    startTransition(async () => {
      const action =
        task.status === "completed" ? reopenTaskAction : completeTaskAction;
      const result = await action(task.id);
      if (!result.success) toast.error(result.error.message);
    });
  }

  function remove(taskId: string) {
    startTransition(async () => {
      const result = await deleteTaskAction(taskId);
      if (!result.success) toast.error(result.error.message);
      else toast.success("Task deleted.");
    });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Plus className="size-4" />
              New task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form
              action={(formData) =>
                startTransition(async () => {
                  const result = await createTaskAction(formData);
                  if (!result.success) {
                    toast.error(result.error.message);
                    return;
                  }
                  toast.success("Task created.");
                  setDialogOpen(false);
                })
              }
              className="flex flex-col gap-4"
            >
              <DialogHeader>
                <DialogTitle>New task</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required autoFocus />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="priority">Priority</Label>
                  <Select name="priority" defaultValue="medium">
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dueDate">Due date</Label>
                  <Input id="dueDate" name="dueDate" type="date" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="estimatedMinutes">Est. minutes</Label>
                  <Input
                    id="estimatedMinutes"
                    name="estimatedMinutes"
                    type="number"
                    min={1}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    name="category"
                    placeholder="e.g. work"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  Create task
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as (typeof STATUS_FILTERS)[number])}
      >
        <TabsList>
          {STATUS_FILTERS.map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize">
              {s.replace("_", " ")}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-1">
        {filtered.length === 0 && (
          <p className="text-muted-foreground py-12 text-center text-sm">
            No tasks here. Nice and clear.
          </p>
        )}
        {filtered.map((task) => (
          <div
            key={task.id}
            className="group flex items-start gap-3 rounded-md border-b px-2 py-3 last:border-b-0"
          >
            <Checkbox
              checked={task.status === "completed"}
              onCheckedChange={() => toggle(task)}
              aria-label={`Mark "${task.title}" ${task.status === "completed" ? "not done" : "done"}`}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <p
                className={
                  task.status === "completed"
                    ? "text-muted-foreground line-through"
                    : ""
                }
              >
                {task.title}
              </p>
              {task.description && (
                <p className="text-muted-foreground text-sm">
                  {task.description}
                </p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <PriorityBadge priority={task.priority} />
                {task.dueDate && (
                  <span className="text-muted-foreground">
                    Due {formatDateLabel(task.dueDate)}
                  </span>
                )}
                {task.category && (
                  <span className="text-muted-foreground">{task.category}</span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground opacity-0 group-hover:opacity-100"
              onClick={() => remove(task.id)}
              aria-label={`Delete "${task.title}"`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
