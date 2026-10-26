"use client";

import { type FormEvent, useState } from "react";
import { LoaderCircle, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  reply?: CoachReply;
};

export function CoachForm() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      const assistantContent = [
        `Summary: ${reply.summary}`,
        `Next steps: ${reply.nextSteps.join("; ")}`,
        `Reasoning: ${reply.reasoning}`,
      ].join("\n");
      setMessages((current) =>
        [
          ...current,
          { role: "user", content: prompt.trim() },
          { role: "assistant", content: assistantContent, reply },
        ].slice(-6),
      );
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
              </div>
            ),
          )}
        </section>
      )}
    </div>
  );
}
