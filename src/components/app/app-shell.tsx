"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ListTodo,
  CalendarDays,
  Target,
  ShoppingCart,
  Wallet,
  Repeat,
  Activity,
  Settings,
  LogOut,
  Bot,
} from "lucide-react";
import { signOutAction } from "@/lib/actions/session";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { WebmcpProvider } from "@/components/webmcp/webmcp-provider";
import { WebmcpStatusPill } from "@/components/webmcp/webmcp-status-pill";
import { ActivityPanel } from "./activity-panel";
import { CommandPalette } from "./command-palette";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/tasks", label: "Tasks", icon: ListTodo },
  { href: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/app/goals", label: "Goals", icon: Target },
  { href: "/app/shopping", label: "Shopping", icon: ShoppingCart },
  { href: "/app/expenses", label: "Expenses", icon: Wallet },
  { href: "/app/routines", label: "Routines", icon: Repeat },
];

const SECONDARY_NAV = [
  { href: "/app/activity", label: "Activity", icon: Activity },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [activityOpen, setActivityOpen] = useState(false);

  return (
    <WebmcpProvider>
      <div className="flex min-h-full flex-1">
        <aside className="hidden w-56 shrink-0 flex-col border-r px-3 py-4 md:flex">
          <Link
            href="/app/dashboard"
            className="px-2 py-2 text-lg font-semibold tracking-tight"
          >
            LifeOS
          </Link>
          <nav className="mt-4 flex flex-1 flex-col gap-0.5">
            {NAV.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={pathname.startsWith(item.href)}
              />
            ))}
            <div className="my-2 border-t" />
            {SECONDARY_NAV.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={pathname.startsWith(item.href)}
              />
            ))}
          </nav>
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              className="text-muted-foreground w-full justify-start gap-2"
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b px-4 py-3 md:px-6">
            <CommandPalette />
            <div className="flex items-center gap-3">
              <WebmcpStatusPill />
              <Sheet open={activityOpen} onOpenChange={setActivityOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Bot className="size-4" />
                    Agent activity
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full p-0 sm:max-w-md">
                  <SheetHeader className="border-b">
                    <SheetTitle>Agent activity</SheetTitle>
                  </SheetHeader>
                  <ActivityPanel />
                </SheetContent>
              </Sheet>
              <span className="text-muted-foreground hidden text-sm sm:inline">
                {userName}
              </span>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
            {children}
          </main>
        </div>
      </div>
    </WebmcpProvider>
  );
}

function NavLink({
  item,
  active,
}: {
  item: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-secondary text-secondary-foreground"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {item.label}
    </Link>
  );
}
