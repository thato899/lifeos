import { auth } from "@/auth";
import { requireUserId } from "@/lib/auth-scope";
import { listBudgets } from "@/services/expense.service";
import { getSchedulingPreferences } from "@/services/user.service";
import { SettingsView } from "@/components/app/settings-view";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const session = await auth();
  const [prefs, budgets] = await Promise.all([
    getSchedulingPreferences(userId),
    listBudgets(userId),
  ]);

  return (
    <SettingsView
      email={session?.user?.email ?? ""}
      name={session?.user?.name ?? ""}
      prefs={{
        workingHoursStart: prefs.workingHoursStart,
        workingHoursEnd: prefs.workingHoursEnd,
        noScheduleAfter: prefs.noScheduleAfter ?? "",
      }}
      budgets={budgets.map((b) => ({
        category: b.category,
        monthlyLimit: Number(b.monthlyLimit),
      }))}
    />
  );
}
