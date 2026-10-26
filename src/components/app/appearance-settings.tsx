"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Label } from "@/components/ui/label";
import { useAccessibilityPreferences } from "./app-providers";

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const {
    contrast,
    setContrast,
    speechVoiceURI,
    setSpeechVoiceURI,
    speechRate,
    setSpeechRate,
  } = useAccessibilityPreferences();
  const [mounted, setMounted] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!("speechSynthesis" in window)) return;

    setSpeechSupported(true);
    const updateVoices = () => setVoices(window.speechSynthesis.getVoices());
    updateVoices();
    window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-1.5">
        <Label htmlFor="color-theme">Color theme</Label>
        <select
          id="color-theme"
          value={mounted ? (theme ?? "system") : "system"}
          onChange={(event) => setTheme(event.target.value)}
          className="border-input bg-background focus-visible:ring-ring h-10 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          <option value="system">Use device setting</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <p className="text-muted-foreground text-xs">
          Follow your device or choose a theme for this browser.
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="text-contrast">Text contrast</Label>
        <select
          id="text-contrast"
          value={contrast}
          onChange={(event) => setContrast(event.target.value === "high" ? "high" : "standard")}
          className="border-input bg-background focus-visible:ring-ring h-10 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          <option value="standard">Standard</option>
          <option value="high">High contrast</option>
        </select>
        <p className="text-muted-foreground text-xs">
          Strengthen text, borders, and keyboard focus indicators throughout LifeOS.
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="speech-voice">Read-aloud voice</Label>
        <select
          id="speech-voice"
          value={speechVoiceURI}
          onChange={(event) => setSpeechVoiceURI(event.target.value)}
          disabled={!speechSupported}
          className="border-input bg-background focus-visible:ring-ring h-10 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
        >
          <option value="">Device default voice</option>
          {voices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voice.name} ({voice.lang}){voice.default ? " — default" : ""}
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">
          {speechSupported
            ? "Available voices depend on your browser and device."
            : "Read aloud is not supported by this browser."}
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="speech-rate">Read-aloud speed</Label>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs">Slower</span>
          <input
            id="speech-rate"
            type="range"
            min="0.75"
            max="1.5"
            step="0.25"
            value={speechRate}
            onChange={(event) => setSpeechRate(Number(event.target.value))}
            aria-label="Read-aloud speed"
            disabled={!speechSupported}
            className="accent-primary min-w-0 flex-1"
          />
          <output htmlFor="speech-rate" className="w-12 text-right text-sm tabular-nums">
            {Number(speechRate.toFixed(2))}×
          </output>
        </div>
      </div>
    </div>
  );
}
