import { Sparkles } from "lucide-react";
import { requireUserId } from "@/lib/auth-scope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CoachForm } from "@/components/app/coach-form";

export default async function CoachPage() {
  await requireUserId();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Sparkles className="size-4" /> Your planning companion
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">AI Coach</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Get a practical suggestion based on your current priorities, deadlines, schedule, and goals.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What would help right now?</CardTitle>
          <CardDescription>
            Ask for a focus plan, help prioritizing, or a way to make progress on a goal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CoachForm />
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs leading-relaxed">
        Your question, recent conversation, and a small LifeOS snapshot that includes a schedule plan are sent to DeepSeek to generate the reply. The Coach cannot change your data on its own. Review the deterministic schedule preview and explicitly approve it before blocks are added to your calendar. Conversation history is kept only in this page session.
      </p>
    </div>
  );
}
