import { requireUserId } from "@/lib/auth-scope";
import { listGoals } from "@/services/goal.service";
import { GoalsView } from "@/components/app/goals-view";

export default async function GoalsPage({
  searchParams,
}: PageProps<"/app/goals">) {
  const userId = await requireUserId();
  const goals = await listGoals(userId);
  const params = await searchParams;

  return (
    <GoalsView
      goals={goals.map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        category: g.category,
        status: g.status,
        progress: g.progress,
        targetDate: g.targetDate?.toISOString() ?? null,
        milestones: g.milestones.map((m) => ({
          id: m.id,
          title: m.title,
          completed: m.completed,
        })),
      }))}
      openCreateOnLoad={params.new === "1"}
    />
  );
}
