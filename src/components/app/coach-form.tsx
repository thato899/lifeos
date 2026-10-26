"use client";

import { type FormEvent, useState } from "react";
import { LoaderCircle, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { applyPlanAction } from "@/lib/actions/planning";

const SUGGESTIONS = [
  "Help me choose what to focus on today.",
  "How can I make progress on my goals this week?",
  "Suggest a realistic plan around today's schedule.",
];
type CoachReply = {
  summary: string;
  nextSteps: string[];
  reasoning: string;
  followUp: string | null;
};
type SuggestedDayPlan = {
  proposedBlocks: { taskId: string; title: string; start: string; end: string; estimatedMinutes: number }[];
  unscheduledTasks: { title: string; reason: string }[];
  freeMinutesRemaining: number;
};
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  reply?: CoachReply;
  plan?: SuggestedDayPlan;
  planStatus?: string;
};

export function CoachForm() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [applyingPlan, setApplyingPlan] = useState<number | null>(null);

  async function approvePlan(messageIndex: number, plan: SuggestedDayPlan) {
    if (!plan.proposedBlocks.length || applyingPlan !== null) return;
    setApplyingPlan(messageIndex);
    setError("");
    try {
      const result = await applyPlanAction(
        plan.proposedBlocks.map(({ taskId, title, start, end }) => ({ taskId, title, start, end })),
      );
      if (!result.success) throw new Error(result.error.message);
      setMessages((current) => current.map((message, index) => index === messageIndex
        ? { ...message, planStatus: `Added ${result.data.scheduledCount} task${result.data.scheduledCount === 1 ? "" : "s"} to your calendar.` }
        : message));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not apply this plan. Please try again.");
    } finally {
      setApplyingPlan(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          history: messages.slice(-6).map(({ role, content }) => ({ role, content })),
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof result === "object" && result !== null && "error" in result
            ? (result as { error: string }).error
            : "The coach could not answer. Please try again.";
        throw new Error(message);
      }
      const reply =
        typeof result === "object" && result !== null && "reply" in result
          ? (result as { reply: CoachReply }).reply
          : "";
      if (typeof reply !== "object") throw new Error("The coach returned an empty reply. Please try again.");
      const plan = typeof result === "object" && result !== null && "suggestedDayPlan" in result
        ? (result as { suggestedDayPlan: SuggestedDayPlan }).suggestedDayPlan
        : undefined;
      const assistantContent = [
        `Summary: ${reply.summary}`,
        `Next steps: ${reply.nextSteps.join("; ")}`,
        `Reasoning: ${reply.reasoning}`,
      ].join("\n");
      setMessages((current) => {
        const updated: ChatMessage[] = [
          ...current,
          { role: "user", content: prompt.trim() },
          { role: "assistant", content: assistantContent, reply, plan },
        ];
        return updated.slice(-6);
      });
      setPrompt("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setPrompt(suggestion)}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/70 rounded-full px-3 py-1.5 text-left text-xs transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <Textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          maxLength={1200}
          rows={4}
          placeholder="For example: I have two urgent tasks and a meeting this afternoon. Help me decide what to do first."
          aria-label="Ask the LifeOS Coach"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground text-xs">{prompt.length}/1200</span>
          <Button type="submit" disabled={!prompt.trim() || loading} className="gap-2">
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
            {loading ? "Thinking…" : "Ask coach"}
          </Button>
        </div>
      </form>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      {messages.length > 0 && (
        <section aria-live="polite" aria-label="Coach conversation" className="flex flex-col gap-3">
          {messages.map((message, index) =>
            message.role === "user" ? (
              <div key={`${index}-user`} className="bg-secondary ml-auto max-w-[90%] rounded-xl px-4 py-3 text-sm">
                {message.content}
              </div>
            ) : (
              <div key={`${index}-assistant`} className="rounded-xl border p-4">
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="size-4" /> Coach suggestion
                </h2>
                <p className="text-sm leading-relaxed">{message.reply?.summary}</p>
                <ol className="mt-3 list-inside list-decimal space-y-1.5 text-sm">
                  {message.reply?.nextSteps.map((step) => <li key={step}>{step}</li>)}
                </ol>
                <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                  {message.reply?.reasoning}
                </p>
                {message.reply?.followUp && (
                  <button
                    type="button"
                    onClick={() => setPrompt(message.reply?.followUp ?? "")}
                    className="text-primary mt-3 text-left text-xs underline underline-offset-4"
                  >
                    {message.reply.followUp}
                  </button>
                )}
                {message.plan && (
                  <div className="mt-4 rounded-lg bg-secondary/50 p-3">
                    <h3 className="text-sm font-semibold">Today’s plan preview</h3>
                    <p className="text-muted-foreground mt-1 text-xs">Review these time blocks. Your calendar changes only after you approve them.</p>
                    {message.plan.proposedBlocks.length ? (
                      <ul className="mt-3 space-y-2 text-sm">
                        {message.plan.proposedBlocks.map((block) => (
                          <li key={`${block.taskId}-${block.start}`} className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                            <span>{block.title} <span className="text-muted-foreground">({block.estimatedMinutes} min)</span></span>
                            <time className="text-muted-foreground">{new Date(block.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}–{new Date(block.end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="mt-2 text-sm">No tasks fit into today’s available time.</p>}
                    {message.plan.unscheduledTasks.length > 0 && (
                      <details className="mt-3 text-xs">
                        <summary className="cursor-pointer">{message.plan.unscheduledTasks.length} task(s) left unscheduled</summary>
                        <ul className="mt-2 list-inside list-disc space-y-1">
                          {message.plan.unscheduledTasks.map((task) => <li key={task.title}>{task.title}: {task.reason}</li>)}
                        </ul>
                      </details>
                    )}
                    <p className="text-muted-foreground mt-2 text-xs">{message.plan.freeMinutesRemaining} free minutes remain.</p>
                    {message.planStatus ? (
                      <p role="status" className="mt-3 text-sm font-medium">{message.planStatus}</p>
                    ) : message.plan.proposedBlocks.length > 0 && (
                      <Button type="button" className="mt-3" disabled={applyingPlan !== null} onClick={() => void approvePlan(index, message.plan!)}>
                        {applyingPlan === index && <LoaderCircle className="size-4 animate-spin" />}
                        {applyingPlan === index ? "Adding plan…" : "Approve & add to calendar"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ),
          )}
        </section>
      )}
    </div>
  );
}
