import { requireUserId } from "@/lib/auth-scope";
import { getSchedule } from "@/services/schedule.service";
import { listTasks } from "@/services/task.service";
import { CalendarView } from "@/components/app/calendar-view";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function CalendarPage() {
  const userId = await requireUserId();
  // A rolling 7-day window starting today, rather than a Monday-anchored ISO
  // week — a strict calendar week would show mostly-past days whenever
  // "today" happens to fall near the end of it (e.g. a Saturday/Sunday),
  // which is a bad default for an agenda view.
  const rangeStart = startOfToday();
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + 7);

  const [blocks, tasks] = await Promise.all([
    getSchedule(userId, rangeStart.toISOString(), rangeEnd.toISOString()),
    listTasks(userId, { status: "planned" }),
  ]);

  return (
    <CalendarView
      weekStartIso={rangeStart.toISOString()}
      blocks={blocks.map((b) => ({
        id: b.id,
        title: b.title,
        start: b.start.toISOString(),
        end: b.end.toISOString(),
        category: b.category,
        taskId: b.taskId,
      }))}
      availableTasks={tasks.map((t) => ({ id: t.id, title: t.title }))}
    />
  );
}
