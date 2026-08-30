"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

/**
 * Cmd/Ctrl+K command palette (spec section 58). Deliberately independent of
 * WebMCP — this is the fast keyboard path for a human driving the app
 * directly, not an agent surface.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:bg-secondary/60 flex w-full max-w-xs items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Tell LifeOS what you need…</span>
        <CommandShortcut>⌘K</CommandShortcut>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command palette"
        description="Jump to a page or start a common action"
      >
        <CommandInput placeholder="Search pages and actions…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Go to">
            <CommandItem onSelect={() => go("/app/dashboard")}>
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => go("/app/tasks")}>Tasks</CommandItem>
            <CommandItem onSelect={() => go("/app/calendar")}>
              Calendar
            </CommandItem>
            <CommandItem onSelect={() => go("/app/goals")}>Goals</CommandItem>
            <CommandItem onSelect={() => go("/app/shopping")}>
              Shopping
            </CommandItem>
            <CommandItem onSelect={() => go("/app/expenses")}>
              Expenses
            </CommandItem>
            <CommandItem onSelect={() => go("/app/routines")}>
              Routines
            </CommandItem>
            <CommandItem onSelect={() => go("/app/activity")}>
              Activity
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => go("/app/tasks?new=1")}>
              Create task
            </CommandItem>
            <CommandItem onSelect={() => go("/app/goals?new=1")}>
              Create goal
            </CommandItem>
            <CommandItem onSelect={() => go("/app/expenses?new=1")}>
              Add expense
            </CommandItem>
            <CommandItem onSelect={() => go("/app/shopping?new=1")}>
              New shopping list
            </CommandItem>
            <CommandItem onSelect={() => go("/app/calendar?plan=day")}>
              Plan my day
            </CommandItem>
            <CommandItem onSelect={() => go("/app/calendar?plan=week")}>
              Plan my week
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
