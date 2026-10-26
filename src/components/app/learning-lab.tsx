"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Check,
  Clock3,
  Download,
  FileUp,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  createSampleProfile,
  CURRICULUM,
  getTopicMastery,
  recommendPath,
  TARGET_OPTIONS,
  type LearnerProfile,
  type TopicId,
} from "@/lib/learning/curriculum";
import { parsePracticeCsv, practiceCsv } from "@/lib/learning/csv";

const STORAGE_KEY = "lifeos-learning-lab-v1";

function safeProfile(raw: string | null): { profile: LearnerProfile; demoMode: boolean } | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { profile?: Partial<LearnerProfile>; demoMode?: boolean };
    const profile = value.profile;
    if (!profile || !CURRICULUM.some((topic) => topic.id === profile.targetId)) return null;
    const attempts = Array.isArray(profile.attempts)
      ? profile.attempts.flatMap((attempt) => {
          if (
            !attempt ||
            !CURRICULUM.some((topic) => topic.id === attempt.topicId) ||
            !Number.isFinite(attempt.score) ||
            !Number.isFinite(attempt.daysAgo) ||
            !Number.isFinite(attempt.minutes)
          ) return [];
          return [{
            topicId: attempt.topicId as TopicId,
            score: Math.max(0, Math.min(100, attempt.score as number)),
            daysAgo: Math.max(0, attempt.daysAgo as number),
            minutes: Math.max(1, Math.min(180, attempt.minutes as number)),
          }];
        })
      : [];
    return {
      profile: {
        targetId: profile.targetId as TopicId,
        weeklyMinutes: Math.max(30, Math.min(600, Number(profile.weeklyMinutes) || 100)),
        sessionMinutes: [15, 25, 45].includes(Number(profile.sessionMinutes)) ? Number(profile.sessionMinutes) : 25,
        attempts,
      },
      demoMode: value.demoMode !== false,
    };
  } catch {
    return null;
  }
}

export function LearningLab() {
  const [profile, setProfile] = useState<LearnerProfile>(() => createSampleProfile());
  const [demoMode, setDemoMode] = useState(true);
  const [ready, setReady] = useState(false);
  const [quizTopic, setQuizTopic] = useState<TopicId>("loops");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [lastResult, setLastResult] = useState<{ topicId: TopicId; score: number } | null>(null);
  const [dataMessage, setDataMessage] = useState("");
  const [aiLesson, setAiLesson] = useState<{ explanation: string; example: string; practicePrompt: string } | null>(null);
  const [aiMessage, setAiMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const saved = safeProfile(window.localStorage.getItem(STORAGE_KEY));
    if (saved) {
      setProfile(saved.profile);
      setDemoMode(saved.demoMode);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, demoMode }));
  }, [profile, demoMode, ready]);

  const path = useMemo(() => recommendPath(profile), [profile]);
  const signals = useMemo(
    () => CURRICULUM.map((topic) => ({ topic, ...getTopicMastery(topic.id, profile.attempts) })),
    [profile.attempts],
  );
  const currentQuiz = CURRICULUM.find((topic) => topic.id === quizTopic)!;
  const nextTopic = path[0];
  const estimatedMinutes = path.reduce((total, item) => total + item.topic.durationMinutes, 0);
  const weeks = Math.max(1, Math.ceil(estimatedMinutes / profile.weeklyMinutes));
  const averageMastery = Math.round(
    signals.reduce((sum, signal) => sum + signal.score, 0) / signals.length,
  );
  const practicedTopics = signals.filter((signal) => signal.attempts > 0).length;

  function updateProfile(values: Partial<LearnerProfile>) {
    setProfile((current) => ({ ...current, ...values }));
  }

  function changeQuizTopic(topicId: TopicId) {
    setQuizTopic(topicId);
    setAnswers({});
    setLastResult(null);
  }

  function submitCheckIn() {
    if (Object.keys(answers).length !== currentQuiz.questions.length) return;
    const correct = currentQuiz.questions.reduce(
      (count, question, index) => count + Number(answers[index] === question.answer),
      0,
    );
    const score = Math.round((correct / currentQuiz.questions.length) * 100);
    setProfile((current) => ({
      ...current,
      attempts: [
        { topicId: quizTopic, score, daysAgo: 0, minutes: current.sessionMinutes },
        ...current.attempts.filter((attempt) => attempt.topicId !== quizTopic || attempt.daysAgo > 0),
      ],
    }));
    setDemoMode(false);
    setLastResult({ topicId: quizTopic, score });
  }

  function resetProfile() {
    setProfile(createSampleProfile());
    setDemoMode(true);
    setAnswers({});
    setLastResult(null);
    setDataMessage("Sample learner profile restored.");
  }

  async function importPracticeData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = parsePracticeCsv(await file.text());
      setProfile((current) => ({ ...current, attempts: imported }));
      setDemoMode(false);
      setDataMessage(`Imported ${imported.length} practice records. They stay in this browser.`);
    } catch (error) {
      setDataMessage(error instanceof Error ? error.message : "Could not read this CSV file.");
    }
  }

  function exportPracticeData() {
    const blob = new Blob([practiceCsv(profile.attempts)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "studypath-practice.csv";
    link.click();
    URL.revokeObjectURL(url);
    setDataMessage(`Exported ${profile.attempts.length} practice records.`);
  }

  async function generateLesson() {
    if (!nextTopic || aiLoading) return;
    setAiLoading(true);
    setAiMessage("");
    setAiLesson(null);
    try {
      const response = await fetch("/api/learn/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: nextTopic.topic.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not generate a lesson.");
      setAiLesson(result.lesson);
    } catch (error) {
      setAiMessage(error instanceof Error ? error.message : "Could not generate a lesson.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Sparkles className="size-4" /> StudyPath · DataNova DN-ED-01
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">A learning path that adapts to you</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Short skill checks and practice history shape your next steps. The recommendation logic is transparent, prerequisite-aware, and updated after every check-in.
          </p>
        </div>
        <Badge variant={demoMode ? "secondary" : "default"} className="w-fit gap-1.5">
          <BrainCircuit className="size-3.5" />
          {demoMode ? "Sample learner data" : "Your practice data"}
        </Badge>
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Learning progress summary">
        <Metric icon={Target} label="Learning goal" value={TARGET_OPTIONS.find((goal) => goal.id === profile.targetId)?.label ?? "Selected goal"} />
        <Metric icon={TrendingUp} label="Average mastery" value={`${averageMastery}%`} detail={`${practicedTopics} of ${CURRICULUM.length} skills checked`} />
        <Metric icon={Clock3} label="Estimated path" value={`${weeks} ${weeks === 1 ? "week" : "weeks"}`} detail={`${estimatedMinutes} min of focused practice`} />
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Your recommended sequence</CardTitle>
                  <CardDescription className="mt-1">Prerequisite graph + recent performance + practice recency + your study rhythm</CardDescription>
                </div>
                <Badge variant="outline" className="shrink-0">{path.length} focused steps</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {path.map((item, index) => (
                <div key={item.topic.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold ${index === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                      {index === 0 ? <Sparkles className="size-4" /> : index + 1}
                    </span>
                    {index < path.length - 1 && <span className="my-1 h-full min-h-5 border-l border-dashed" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0 flex-1 rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{item.topic.title}</p>
                        <p className="text-muted-foreground mt-1 text-xs">{item.topic.description}</p>
                      </div>
                      <Badge variant={item.mastery < 65 ? "destructive" : "secondary"}>
                        {item.mastery}% mastery
                      </Badge>
                    </div>
                    <div className="bg-secondary mt-3 h-1.5 overflow-hidden rounded-full" role="progressbar" aria-label={`${item.topic.title} mastery`} aria-valuenow={item.mastery} aria-valuemin={0} aria-valuemax={100}>
                      <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${item.mastery}%` }} />
                    </div>
                    <div className="text-muted-foreground mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span>{item.reason}</span>
                      <span className="flex shrink-0 items-center gap-1"><Clock3 className="size-3" />{item.topic.durationMinutes} min</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-muted/50 mt-2 flex items-start gap-2 rounded-md p-3 text-xs">
                <ArrowRight className="text-primary mt-0.5 size-4 shrink-0" />
                <p><span className="font-medium">Next up:</span> {nextTopic?.topic.title}. {nextTopic?.reason}.</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">AI micro-lesson</p>
                    <p className="text-muted-foreground mt-1 text-xs">DeepSeek explains your next recommended skill. Your scores and profile stay out of the AI request.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={generateLesson} disabled={aiLoading || !nextTopic} className="gap-2">
                    <Sparkles className="size-4" /> {aiLoading ? "Creating…" : "Teach me this"}
                  </Button>
                </div>
                {aiMessage && <p className="mt-3 text-sm" role="alert">{aiMessage}</p>}
                {aiLesson && <div className="mt-3 space-y-3 border-t pt-3 text-sm" aria-live="polite">
                  <p>{aiLesson.explanation}</p>
                  <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs"><code>{aiLesson.example}</code></pre>
                  <p><span className="font-medium">Try it:</span> {aiLesson.practicePrompt}</p>
                </div>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BookOpen className="size-4" /> Check your understanding</CardTitle>
              <CardDescription>Answer three quick questions. Your result updates this browser’s learner profile and reshapes the path.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quiz-topic">Skill to check</Label>
                <select id="quiz-topic" value={quizTopic} onChange={(event) => changeQuizTopic(event.target.value as TopicId)} className="bg-background h-9 rounded-md border px-3 text-sm">
                  {CURRICULUM.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
                </select>
              </div>
              {currentQuiz.questions.map((question, questionIndex) => (
                <fieldset key={question.prompt} className="flex flex-col gap-2">
                  <legend className="text-sm font-medium">{questionIndex + 1}. {question.prompt}</legend>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {question.options.map((option, optionIndex) => {
                      const selected = answers[questionIndex] === optionIndex;
                      return (
                        <button key={option} type="button" aria-pressed={selected} onClick={() => setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }))} className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${selected ? "border-primary bg-primary/10 ring-ring ring-1" : "hover:bg-muted"}`}>
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={submitCheckIn} disabled={Object.keys(answers).length !== currentQuiz.questions.length} className="gap-2">
                  <Check className="size-4" /> Record check-in
                </Button>
                {lastResult?.topicId === quizTopic && (
                  <p className="text-sm" role="status">Recorded: {lastResult.score}% mastery. Your path has been recalculated.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Shape your plan</CardTitle>
              <CardDescription>These preferences affect both the recommendation and time estimate.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="learning-goal">I want to…</Label>
                <select id="learning-goal" value={profile.targetId} onChange={(event) => updateProfile({ targetId: event.target.value as TopicId })} className="bg-background h-9 rounded-md border px-3 text-sm">
                  {TARGET_OPTIONS.map((goal) => <option key={goal.id} value={goal.id}>{goal.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="weekly-minutes">Minutes per week</Label>
                  <input id="weekly-minutes" type="number" min={30} max={600} step={10} value={profile.weeklyMinutes} onChange={(event) => updateProfile({ weeklyMinutes: Math.max(30, Math.min(600, Number(event.target.value) || 30)) })} className="bg-background h-9 rounded-md border px-3 text-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="session-length">Session length</Label>
                  <select id="session-length" value={profile.sessionMinutes} onChange={(event) => updateProfile({ sessionMinutes: Number(event.target.value) })} className="bg-background h-9 rounded-md border px-3 text-sm">
                    <option value={15}>15 minutes</option><option value={25}>25 minutes</option><option value={45}>45 minutes</option>
                  </select>
                </div>
              </div>
              <div className="bg-muted/50 rounded-md p-3 text-xs leading-relaxed">
                <p className="font-medium">How recommendations work</p>
                <p className="text-muted-foreground mt-1">Skills are linked by prerequisites. Recent check-in scores are freshness-weighted; lower mastery and longer gaps raise practice priority. Your goal, session length, and weekly time budget shape the sequence and estimate.</p>
              </div>
              <Button variant="outline" onClick={resetProfile} className="w-fit gap-2">
                <RotateCcw className="size-4" /> Reset sample learner
              </Button>
              <div className="border-t pt-4">
                <p className="text-sm font-medium">Use your own learning data</p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">Import a CSV with columns <code>topicId,score,daysAgo,minutes</code>. Data is checked in your browser and never uploaded.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="border-input hover:bg-accent inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium">
                    <FileUp className="size-4" /> Import CSV
                    <input type="file" accept=".csv,text/csv" onChange={importPracticeData} className="sr-only" aria-label="Import practice data from CSV" />
                  </label>
                  <Button variant="outline" size="sm" onClick={exportPracticeData} className="gap-2">
                    <Download className="size-4" /> Export CSV
                  </Button>
                </div>
                {dataMessage && <p className="mt-2 text-xs" role="status">{dataMessage}</p>}
                <a className="text-primary mt-2 inline-block text-xs underline underline-offset-4" href={`data:text/csv;charset=utf-8,${encodeURIComponent("topicId,score,daysAgo,minutes\npython-basics,80,2,20\n")}`} download="studypath-template.csv">Download a CSV template</a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="size-4" /> Skill signals</CardTitle>
              <CardDescription>Mastery estimate from practice check-ins.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {signals.map((signal) => (
                <div key={signal.topic.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate">{signal.topic.title}</span>
                    <span className="text-muted-foreground shrink-0">{signal.attempts === 0 ? "Not checked" : `${signal.score}%`}</span>
                  </div>
                  <div className="bg-secondary h-1.5 overflow-hidden rounded-full" aria-hidden="true">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${signal.score}%` }} />
                  </div>
                </div>
              ))}
              <p className="text-muted-foreground border-t pt-3 text-xs">
                {demoMode
                  ? "Synthetic sample profile for the demo. Your check-ins replace the sample signal for each skill."
                  : "Your check-ins are saved in this browser only; no personal learning data is sent to an AI provider."}
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>

      <footer className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs">
        <span>StudyPath · DataNova Education track · DN-ED-01</span>
        <span className="flex items-center gap-1"><ArrowDown className="size-3" />Practice evidence updates your next step</span>
      </footer>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <div className="text-muted-foreground flex items-center gap-2 text-xs"><Icon className="size-3.5" />{label}</div>
        <p className="mt-2 text-base font-semibold leading-snug">{value}</p>
        {detail && <p className="text-muted-foreground mt-1 text-xs">{detail}</p>}
      </CardContent>
    </Card>
  );
}
