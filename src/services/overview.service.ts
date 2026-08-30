import { db } from "@/lib/db";
import { identifyConflicts, summarizeWorkload } from "@/lib/planning/conflicts";
import { planDay } from "@/lib/planning/day-plan";
import { planWeek } from "@/lib/planning/week-plan";
import { prioritizeTasks } from "@/lib/planning/priority-score";
import type { PlanConstraints } from "@/lib/validation/schedule";
import { listScheduleLite } from "./schedule.service";
import { listTasksLite } from "./task.service";
import { getSchedulingPreferences } from "./user.service";

/**
 * Orchestration layer for the "high-level agent workflow" WebMCP tools
 * (analyze_day, plan_my_day, plan_my_week, identify_conflicts,
 * prioritize_tasks) and the human dashboard, which all need the same
 * cross-domain view: tasks + schedule + preferences together. Pure
 * computation lives in lib/planning/*; this module is just the data
 * plumbing and user-facing summarization on top of it.
 */

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function endOfLocalDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

export async function getTodayOverview(userId: string) {
  const now = new Date();
  const [tasks, prefs] = await Promise.all([
    listTasksLite(userId),
    getSchedulingPreferences(userId),
  ]);

  const workload = summarizeWorkload(tasks, now);
  const ranked = prioritizeTasks(tasks, now);

  const todaysSchedule = await db.scheduleBlock.findMany({
    where: {
      userId,
      start: { gte: startOfLocalDay(now) },
      end: { lte: endOfLocalDay(now) },
    },
    orderBy: { start: "asc" },
  });

  const upcomingDeadlines = tasks
    .filter(
      (t) =>
        t.dueDate &&
        t.status !== "completed" &&
        t.status !== "archived" &&
        t.dueDate >= now,
    )
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
      priority: t.priority,
    }));

  const importantGoals = await db.goal.findMany({
    where: { userId, status: "active" },
    orderBy: { updatedAt: "desc" },
    take: 3,
  });

  return {
    date: now.toISOString(),
    highPriorityCount: ranked.filter(
      (r) => r.task.priority === "high" || r.task.priority === "urgent",
    ).length,
    totalOpenTasks: workload.totalTasks,
    overdueCount: workload.overdueTasks.length,
    dueTodayCount: workload.dueTodayTasks.length,
    topPriorities: ranked.slice(0, 5).map((r) => ({
      id: r.task.id,
      title: r.task.title,
      priority: r.task.priority,
      explanation: r.explanation,
    })),
    overdueTasks: workload.overdueTasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
    })),
    todaysSchedule,
    upcomingDeadlines,
    goals: importantGoals.map((g) => ({
      id: g.id,
      title: g.title,
      progress: g.progress,
      status: g.status,
    })),
    noScheduleAfter: prefs.noScheduleAfter,
  };
}

export async function analyzeDay(userId: string, date: Date = new Date()) {
  const [tasks, schedule, prefs] = await Promise.all([
    listTasksLite(userId),
    listScheduleLite(userId),
    getSchedulingPreferences(userId),
  ]);

  const workload = summarizeWorkload(tasks, date);
  const conflicts = identifyConflicts(schedule, tasks, prefs);
  const ranked = prioritizeTasks(tasks, date);

  const dayStart = startOfLocalDay(date);
  const dayEnd = endOfLocalDay(date);
  const scheduledMinutesToday = schedule
    .filter((b) => b.start >= dayStart && b.start <= dayEnd)
    .reduce(
      (sum, b) => sum + (b.end.getTime() - b.start.getTime()) / 60_000,
      0,
    );

  return {
    date: dayStart.toISOString(),
    workload: {
      openTasks: workload.totalTasks,
      overdueTasks: workload.overdueTasks.length,
      dueToday: workload.dueTodayTasks.length,
      estimatedMinutesOutstanding: workload.totalEstimatedMinutes,
    },
    scheduledMinutesToday,
    conflicts,
    topPriorities: ranked.slice(0, 5).map((r) => ({
      id: r.task.id,
      title: r.task.title,
      explanation: r.explanation,
    })),
  };
}

export async function prioritizeTasksForUser(userId: string) {
  const tasks = await listTasksLite(userId);
  const ranked = prioritizeTasks(tasks);
  return ranked.map((r) => ({
    id: r.task.id,
    title: r.task.title,
    priority: r.task.priority,
    score: r.breakdown.score,
    explanation: r.explanation,
  }));
}

export async function identifyConflictsForUser(userId: string) {
  const [tasks, schedule, prefs] = await Promise.all([
    listTasksLite(userId),
    listScheduleLite(userId),
    getSchedulingPreferences(userId),
  ]);
  return identifyConflicts(schedule, tasks, prefs);
}

export async function planMyDayForUser(
  userId: string,
  date: string,
  availableMinutes?: number,
  constraints?: PlanConstraints,
) {
  const [tasks, schedule, prefs] = await Promise.all([
    listTasksLite(userId),
    listScheduleLite(userId),
    getSchedulingPreferences(userId),
  ]);

  return planDay({
    date: new Date(date),
    tasks,
    existingSchedule: schedule,
    prefs,
    availableMinutes,
    noScheduleAfterOverride: constraints?.noScheduleAfter,
    noScheduleBeforeOverride: constraints?.noScheduleBefore,
    excludeCategories: constraints?.excludeCategories,
  });
}

export async function planMyWeekForUser(
  userId: string,
  weekStart: string,
  constraints?: PlanConstraints,
) {
  const [tasks, schedule, prefs] = await Promise.all([
    listTasksLite(userId),
    listScheduleLite(userId),
    getSchedulingPreferences(userId),
  ]);

  return planWeek({
    weekStart: new Date(weekStart),
    tasks,
    existingSchedule: schedule,
    prefs,
    noScheduleAfterOverride: constraints?.noScheduleAfter,
    noScheduleBeforeOverride: constraints?.noScheduleBefore,
    excludeCategories: constraints?.excludeCategories,
  });
}
