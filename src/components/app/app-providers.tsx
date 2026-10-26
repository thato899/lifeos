"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { ThemeProvider } from "next-themes";

type ContrastMode = "standard" | "high";
type AccessibilityPreferences = {
  contrast: ContrastMode;
  setContrast: (contrast: ContrastMode) => void;
  speechVoiceURI: string;
  setSpeechVoiceURI: (voiceURI: string) => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
};

const AccessibilityContext = createContext<AccessibilityPreferences | null>(null);

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AccessibilityPreferencesProvider>{children}</AccessibilityPreferencesProvider>
    </ThemeProvider>
  );
}

function AccessibilityPreferencesProvider({ children }: { children: ReactNode }) {
  const [contrast, setContrastState] = useState<ContrastMode>("standard");
  const [speechVoiceURI, setSpeechVoiceURIState] = useState("");
  const [speechRate, setSpeechRateState] = useState(1);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedContrast = window.localStorage.getItem("lifeos:contrast");
      if (savedContrast === "standard" || savedContrast === "high") {
        setContrastState(savedContrast);
      }
      setSpeechVoiceURIState(window.localStorage.getItem("lifeos:speech-voice") ?? "");
      const savedRate = Number(window.localStorage.getItem("lifeos:speech-rate"));
      if (Number.isFinite(savedRate) && savedRate >= 0.75 && savedRate <= 1.5) {
        setSpeechRateState(savedRate);
      }
    } catch {
      // Keep usable defaults when browser storage is unavailable.
    }
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (preferencesLoaded) {
      document.documentElement.dataset.contrast = contrast;
    }
  }, [contrast, preferencesLoaded]);

  function setContrast(value: ContrastMode) {
    setContrastState(value);
    try {
      window.localStorage.setItem("lifeos:contrast", value);
    } catch {
      // The preference still applies for the current session.
    }
  }

  function setSpeechVoiceURI(value: string) {
    setSpeechVoiceURIState(value);
    try {
      window.localStorage.setItem("lifeos:speech-voice", value);
    } catch {
      // The preference still applies for the current session.
    }
  }

  function setSpeechRate(value: number) {
    const boundedRate = Math.min(1.5, Math.max(0.75, value));
    setSpeechRateState(boundedRate);
    try {
      window.localStorage.setItem("lifeos:speech-rate", String(boundedRate));
    } catch {
      // The preference still applies for the current session.
    }
  }

  return (
    <AccessibilityContext.Provider
      value={{
        contrast,
        setContrast,
        speechVoiceURI,
        setSpeechVoiceURI,
        speechRate,
        setSpeechRate,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibilityPreferences() {
  const preferences = useContext(AccessibilityContext);
  if (!preferences) {
    throw new Error("Accessibility preferences must be used inside AppProviders.");
  }
  return preferences;
}
