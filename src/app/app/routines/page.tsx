import { requireUserId } from "@/lib/auth-scope";
import { listRoutines } from "@/services/routine.service";
import { RoutinesView } from "@/components/app/routines-view";

export default async function RoutinesPage({
  searchParams,
}: PageProps<"/app/routines">) {
  const userId = await requireUserId();
  const routines = await listRoutines(userId, false);
  const params = await searchParams;

  return (
    <RoutinesView
      routines={routines.map((r) => ({
        id: r.id,
        name: r.name,
        frequency: r.frequency,
        active: r.active,
        steps: r.steps.map((s) => ({
          id: s.id,
          title: s.title,
          estimatedMinutes: s.estimatedMinutes,
        })),
      }))}
      openCreateOnLoad={params.new === "1"}
    />
  );
}
