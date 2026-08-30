import Link from "next/link";
import { requireUserId } from "@/lib/auth-scope";
import { getTodayOverview } from "@/services/overview.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDateLabel, formatTimeLabel } from "@/lib/format";
import { PriorityBadge } from "@/components/app/priority-badge";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const overview = await getTodayOverview(userId);
  const today = new Date(overview.date);

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">
          {formatDateLabel(today)}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="High priority" value={overview.highPriorityCount} />
        <StatTile label="Open tasks" value={overview.totalOpenTasks} />
        <StatTile
          label="Overdue"
          value={overview.overdueCount}
          tone={overview.overdueCount > 0 ? "warn" : "default"}
        />
        <StatTile label="Due today" value={overview.dueTodayCount} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top priorities</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {overview.topPriorities.length === 0 && (
              <EmptyRow
                message="Nothing urgent right now — add a task to get started."
                href="/app/tasks"
                cta="Go to tasks"
              />
            )}
            {overview.topPriorities.map((t) => (
              <div
                key={t.id}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <div>
                  <p className="font-medium">{t.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {t.explanation}
                  </p>
                </div>
                <PriorityBadge priority={t.priority} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s schedule</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {overview.todaysSchedule.length === 0 && (
              <EmptyRow
                message="Nothing on the calendar today."
                href="/app/calendar"
                cta="Open calendar"
              />
            )}
            {overview.todaysSchedule.map((block) => (
              <div
                key={block.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>{block.title}</span>
                <span className="text-muted-foreground text-xs">
                  {formatTimeLabel(block.start)} – {formatTimeLabel(block.end)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming deadlines</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {overview.upcomingDeadlines.length === 0 && (
              <EmptyRow
                message="No upcoming deadlines."
                href="/app/tasks"
                cta="View tasks"
              />
            )}
            {overview.upcomingDeadlines.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>{t.title}</span>
                <span className="text-muted-foreground text-xs">
                  {t.dueDate ? formatDateLabel(t.dueDate) : ""}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Goals</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {overview.goals.length === 0 && (
              <EmptyRow
                message="No active goals yet."
                href="/app/goals"
                cta="Create a goal"
              />
            )}
            {overview.goals.map((g) => (
              <div key={g.id} className="flex flex-col gap-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{g.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {g.progress}%
                  </span>
                </div>
                <Progress value={g.progress} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {overview.overdueTasks.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Overdue</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {overview.overdueTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between text-sm"
              >
                <span>{t.title}</span>
                <Badge variant="destructive">
                  Due {t.dueDate ? formatDateLabel(t.dueDate) : ""}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warn";
}) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <p
          className={`text-2xl font-semibold ${tone === "warn" && value > 0 ? "text-destructive" : ""}`}
        >
          {value}
        </p>
        <p className="text-muted-foreground text-xs">{label}</p>
      </CardContent>
    </Card>
  );
}

function EmptyRow({
  message,
  href,
  cta,
}: {
  message: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="text-muted-foreground flex flex-col gap-2 text-sm">
      <p>{message}</p>
      <Link
        href={href}
        className="text-foreground w-fit text-sm font-medium underline underline-offset-4"
      >
        {cta}
      </Link>
    </div>
  );
}
