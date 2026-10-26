"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccessibilityPreferences } from "./app-providers";

export function ReadAloudControl() {
  const pathname = usePathname();
  const { speechVoiceURI, speechRate } = useAccessibilityPreferences();
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
  }, []);

  useEffect(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, [pathname]);

  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
    },
    [],
  );

  function toggleReading() {
    if (!supported) return;
    const synthesis = window.speechSynthesis;
    if (speaking) {
      synthesis.cancel();
      setSpeaking(false);
      return;
    }

    const main = document.querySelector("main");
    const text = main?.innerText.trim();
    if (!text) return;

    synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    const selectedVoice = synthesis
      .getVoices()
      .find((voice) => voice.voiceURI === speechVoiceURI);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synthesis.speak(utterance);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleReading}
      disabled={!supported}
      aria-label={speaking ? "Stop reading page aloud" : "Read page aloud"}
      aria-pressed={speaking}
      aria-controls="main-content"
      className="gap-1.5"
    >
      {speaking ? <Square className="size-4" /> : <Volume2 className="size-4" />}
      <span className="hidden sm:inline">{speaking ? "Stop reading" : "Read aloud"}</span>
    </Button>
  );
}
