"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSchedulingPreferencesAction } from "@/lib/actions/settings";
import { deleteBudgetAction } from "@/lib/actions/expenses";
import { formatCurrency } from "@/lib/format";
import { Trash2 } from "lucide-react";

export function SettingsView({
  email,
  name,
  prefs,
  budgets,
}: {
  email: string;
  name: string;
  prefs: {
    workingHoursStart: string;
    workingHoursEnd: string;
    noScheduleAfter: string;
  };
  budgets: { category: string; monthlyLimit: number }[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p>{name}</p>
          <p className="text-muted-foreground">{email}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduling preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={(formData) =>
              startTransition(async () => {
                const result =
                  await updateSchedulingPreferencesAction(formData);
                if (!result.success) toast.error(result.error.message);
                else toast.success("Preferences saved.");
              })
            }
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="workingHoursStart">Working hours start</Label>
                <Input
                  id="workingHoursStart"
                  name="workingHoursStart"
                  type="time"
                  defaultValue={prefs.workingHoursStart}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="workingHoursEnd">Working hours end</Label>
                <Input
                  id="workingHoursEnd"
                  name="workingHoursEnd"
                  type="time"
                  defaultValue={prefs.workingHoursEnd}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="noScheduleAfter">Never schedule after</Label>
              <Input
                id="noScheduleAfter"
                name="noScheduleAfter"
                type="time"
                defaultValue={prefs.noScheduleAfter}
              />
              <p className="text-muted-foreground text-xs">
                The planner (and any agent using plan_my_day/plan_my_week) will
                treat this as a hard boundary.
              </p>
            </div>
            <Button type="submit" className="w-fit" disabled={isPending}>
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spending targets</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {budgets.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No budgets set. Set one from the Expenses page, or ask an agent
              to.
            </p>
          )}
          {budgets.map((b) => (
            <div
              key={b.category}
              className="flex items-center justify-between text-sm"
            >
              <span className="capitalize">{b.category}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {formatCurrency(b.monthlyLimit)}/mo
                </span>
                <button
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    startTransition(async () => {
                      const result = await deleteBudgetAction(b.category);
                      if (!result.success) toast.error(result.error.message);
                    })
                  }
                  aria-label={`Remove ${b.category} budget`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
