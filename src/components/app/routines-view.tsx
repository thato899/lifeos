"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  createRoutineAction,
  deleteRoutineAction,
} from "@/lib/actions/routines";

interface RoutineRow {
  id: string;
  name: string;
  frequency: string;
  active: boolean;
  steps: { id: string; title: string; estimatedMinutes: number | null }[];
}

export function RoutinesView({
  routines,
  openCreateOnLoad,
}: {
  routines: RoutineRow[];
  openCreateOnLoad?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(openCreateOnLoad));
  const [steps, setSteps] = useState<string[]>([""]);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setSteps([""]);
    setName("");
    setFrequency("weekly");
  }

  function submit() {
    const cleanSteps = steps.map((s) => s.trim()).filter(Boolean);
    if (!name.trim() || cleanSteps.length === 0) {
      toast.error("Give the routine a name and at least one step.");
      return;
    }
    startTransition(async () => {
      const result = await createRoutineAction({
        name: name.trim(),
        frequency,
        steps: cleanSteps.map((title) => ({ title })),
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Routine created.");
      setOpen(false);
      resetForm();
    });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Routines</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Plus className="size-4" />
              New routine
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New routine</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="routine-name">Name</Label>
                <Input
                  id="routine-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Morning routine"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Steps</Label>
                {steps.map((step, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={step}
                      onChange={(e) =>
                        setSteps((prev) =>
                          prev.map((s, idx) =>
                            idx === i ? e.target.value : s,
                          ),
                        )
                      }
                      placeholder={`Step ${i + 1}`}
                    />
                    {steps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove step ${i + 1}`}
                        onClick={() =>
                          setSteps((prev) => prev.filter((_, idx) => idx !== i))
                        }
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => setSteps((prev) => [...prev, ""])}
                >
                  Add step
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={isPending}>
                Create routine
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {routines.length === 0 && (
        <p className="text-muted-foreground text-sm">No routines yet.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {routines.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{r.name}</CardTitle>
                <Badge variant="secondary" className="capitalize">
                  {r.frequency}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <ol className="flex flex-col gap-1 text-sm">
                {r.steps.map((s, i) => (
                  <li key={s.id}>
                    {i + 1}. {s.title}
                  </li>
                ))}
              </ol>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground w-fit gap-1.5"
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteRoutineAction(r.id);
                    if (!result.success) toast.error(result.error.message);
                  })
                }
                disabled={isPending}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
