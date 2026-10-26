import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, UnauthenticatedError } from "@/lib/auth-scope";
import { checkRateLimit } from "@/lib/rate-limit";
import { CURRICULUM, type TopicId } from "@/lib/learning/curriculum";

const requestSchema = z.object({ topicId: z.enum([
  "python-basics", "conditionals", "loops", "functions", "collections", "dataframes", "visualization",
]) });
const lessonSchema = z.object({
  explanation: z.string().min(1).max(500),
  example: z.string().min(1).max(500),
  practicePrompt: z.string().min(1).max(300),
});

export async function POST(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "Sign in to generate an AI lesson." }, { status: 401 });
    }
    throw error;
  }

  const limit = checkRateLimit(`learn-lesson:${userId}`, 60_000, 5);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Please wait a moment before generating another lesson." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid learning topic." }, { status: 400 });

  const topic = CURRICULUM.find(({ id }) => id === parsed.data.topicId as TopicId);
  if (!topic) return NextResponse.json({ error: "Learning topic not found." }, { status: 404 });
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Add DEEPSEEK_API_KEY to your local .env file to enable AI lessons." }, { status: 503 });

  try {
    const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
        temperature: 0.35,
        max_tokens: 450,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: 'Create a concise, beginner-friendly Python/data-learning micro-lesson. Return only JSON with keys "explanation" (plain-language explanation), "example" (short accurate code or example), and "practicePrompt" (one small exercise). Be encouraging, avoid assumptions about the learner, and keep within the requested topic.',
          },
          { role: "user", content: `Topic: ${topic.title}. Description: ${topic.description}.` },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!upstream.ok) return NextResponse.json({ error: "DeepSeek could not generate the lesson. Try again shortly." }, { status: 502 });
    const result: unknown = await upstream.json();
    const content = typeof result === "object" && result !== null && "choices" in result
      ? (result as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content
      : undefined;
    if (typeof content !== "string") return NextResponse.json({ error: "DeepSeek returned an empty lesson." }, { status: 502 });
    let decoded: unknown;
    try { decoded = JSON.parse(content); } catch {
      return NextResponse.json({ error: "DeepSeek returned an unreadable lesson." }, { status: 502 });
    }
    const lesson = lessonSchema.safeParse(decoded);
    if (!lesson.success) return NextResponse.json({ error: "DeepSeek returned an incomplete lesson." }, { status: 502 });
    return NextResponse.json({ lesson: lesson.data, topicTitle: topic.title });
  } catch {
    return NextResponse.json({ error: "The AI service is unavailable right now. Please try again shortly." }, { status: 502 });
  }
}
