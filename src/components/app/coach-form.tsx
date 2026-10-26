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

export function CoachForm() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof result === "object" && result !== null && "error" in result
            ? (result as { error: string }).error
            : "The coach could not answer. Please try again.";
        throw new Error(message);
      }
      const text =
        typeof result === "object" && result !== null && "answer" in result
          ? (result as { answer: string }).answer
          : "";
      if (!text) throw new Error("The coach returned an empty reply. Please try again.");
      setAnswer(text);
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

      {answer && (
        <section aria-live="polite" className="bg-muted/50 rounded-lg border p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4" /> Coach suggestion
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>
        </section>
      )}
    </div>
  );
}
