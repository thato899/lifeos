import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bot,
  Calendar,
  ListTodo,
  Repeat,
  ShoppingCart,
  Target,
  Wallet,
} from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const EXAMPLE_COMMANDS = [
  "Plan my week.",
  "Move my groceries to Saturday.",
  "What am I behind on?",
  "Create an action plan for my goal.",
  "Where did I overspend this month?",
];

const MODULES = [
  { icon: ListTodo, label: "Tasks" },
  { icon: Calendar, label: "Calendar" },
  { icon: Target, label: "Goals" },
  { icon: ShoppingCart, label: "Shopping" },
  { icon: Wallet, label: "Expenses" },
  { icon: Repeat, label: "Routines" },
];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/app/dashboard");

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold tracking-tight">LifeOS</span>
        <nav className="flex items-center gap-4">
          <Link
            href="#webmcp"
            className="text-muted-foreground hover:text-foreground hidden text-sm sm:inline"
          >
            How WebMCP works
          </Link>
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Sign in
          </Link>
          <Button asChild size="sm">
            <Link href="/login">Try LifeOS</Link>
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 pt-16 pb-20 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Your life. Your agent. One workspace.
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg text-balance">
          LifeOS lets you and AI agents plan, organize, and manage everyday life
          together — tasks, calendar, goals, shopping, expenses, and routines,
          all in one place an agent can actually operate.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button asChild size="lg">
            <Link href="/login">
              Try LifeOS
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="#webmcp">See how WebMCP works</Link>
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {EXAMPLE_COMMANDS.map((cmd) => (
            <span
              key={cmd}
              className="text-muted-foreground bg-secondary/60 rounded-full border px-3 py-1 text-xs"
            >
              &ldquo;{cmd}&rdquo;
            </span>
          ))}
        </div>
      </section>

      {/* Workflow diagram */}
      <section id="webmcp" className="border-t px-6 py-20">
        <div className="mx-auto flex max-w-5xl flex-col gap-10">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              How WebMCP works here
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              A human expresses intent. An agent understands it. WebMCP gives
              that agent reliable, structured capabilities. LifeOS executes the
              actions. The human sees exactly what happened — and can approve,
              reject, or adjust it.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-medium">
            {[
              "Human request",
              "Agent",
              "WebMCP tool call",
              "LifeOS state change",
              "Updated UI",
              "Human reviews",
            ].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-2">
                <div className="bg-card rounded-full border px-4 py-2">
                  {step}
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="text-muted-foreground size-4" />
                )}
              </div>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardContent className="flex flex-col gap-2">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Traditional browser automation
                </p>
                <p className="text-sm leading-relaxed">
                  Agent sees the UI → guesses which button means what it wants →
                  clicks → waits → guesses the next state. Slow, brittle, and
                  easy to get subtly wrong on a page it wasn&apos;t trained on.
                </p>
              </CardContent>
            </Card>
            <Card className="border-foreground/20">
              <CardContent className="flex flex-col gap-2">
                <p className="text-xs font-medium tracking-wide uppercase">
                  With WebMCP
                </p>
                <p className="text-sm leading-relaxed">
                  Agent discovers an explicit, described tool → validates
                  structured input against a real schema → invokes it → LifeOS
                  updates its actual state → a typed result comes back. No
                  guessing, no brittle selectors — and every call is authorized
                  and logged the same way, whether it reads data or changes it.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="border-t px-6 py-16">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            One workspace, every part of life
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {MODULES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center"
              >
                <Icon className="text-muted-foreground size-5" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t px-6 py-10">
        <div className="text-muted-foreground mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <Bot className="size-3.5" />
            Built for the OpenAI WebMCP Challenge 2026
          </span>
          <span>MIT licensed · open source</span>
        </div>
      </footer>
    </div>
  );
}
