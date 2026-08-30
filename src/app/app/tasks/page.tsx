import { requireUserId } from "@/lib/auth-scope";
import { listTasks } from "@/services/task.service";
import { TasksView } from "@/components/app/tasks-view";

export default async function TasksPage({
  searchParams,
}: PageProps<"/app/tasks">) {
  const userId = await requireUserId();
  const tasks = await listTasks(userId);
  const params = await searchParams;

  return <TasksView tasks={tasks} openCreateOnLoad={params.new === "1"} />;
}
