import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app/app-shell";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppShell userName={session.user.name ?? session.user.email ?? "You"}>
      {children}
    </AppShell>
  );
}
