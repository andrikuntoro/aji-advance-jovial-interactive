/**
 * useRealtimeSession — Orchestrates realtime OR mock session.
 *
 * LIVE mode: WebRTC → OpenAI Realtime API (requires OPENAI_API_KEY)
 * MOCK mode: Text-based simulation using existing AJI scenario engine (no key needed)
 *
 * Features:
 * - Opening greeting "Hai, agen! Apakabar?" when session becomes active
 * - 5-minute inactivity auto-end (only trainee activity resets the timer)
 */
"use client";

import { useCallback, useEffect, useRef } from "react";
import { RealtimeClient } from "@/lib/realtime/webrtc-client";
import { useRealtimeStore } from "@/stores/realtime-store";
import { RealtimeSessionConfig } from "@/types/domain";

// Maps realtime store stage keys → respond-engine stage keys
const REALTIME_TO_ENGINE: Record<string, string> = {
  opening:             "opening",
  rapport_building:    "permission_to_continue",
  needs_exploration:   "needs_exploration",
  objection_triggered: "objection_triggered",
  objection_handling:  "objection_triggered",
  value_reframe:       "value_reframe",
  closing:             "appointment_or_next_step",
  completed:           "completed",
};

// Maps respond-engine stage keys → realtime store stage keys
const ENGINE_TO_REALTIME: Record<string, string> = {
  opening:                  "opening",
  permission_to_continue:   "rapport_building",
  needs_exploration:        "needs_exploration",
  objection_triggered:      "objection_triggered",
  value_reframe:            "value_reframe",
  appointment_or_next_step: "closing",
  closing:                  "closing",
  completed:                "completed",
};

/** How long trainee can be idle before the session auto-ends (ms). */
const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
/** How often the inactivity watcher checks (ms). */
const INACTIVITY_CHECK_MS = 10_000;         // 10 seconds

export function useRealtimeSession() {
  const clientRef     = useRef<RealtimeClient | null>(null);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const inactivityRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const store         = useRealtimeStore();
  const openingGreetingRef = useRef<string>("Hai, agen! Apakabar?");

  // ── Internal helpers ───────────────────────────────────
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => store.tickTimer(), 1000);
  }, [store]);

  const stopAllTimers = useCallback(() => {
    if (timerRef.current)      { clearInterval(timerRef.current);      timerRef.current = null; }
    if (inactivityRef.current) { clearInterval(inactivityRef.current); inactivityRef.current = null; }
  }, []);

  /** Inject the opening greeting as the first AI message. */
  const sendOpeningGreeting = useCallback(() => {
    const greetId = `greeting-${Date.now()}`;
    const greeting = openingGreetingRef.current;
    store.appendTranscriptDelta("ai_client", greeting, greetId);
    store.finalizeTranscript("ai_client", greeting, greetId, store.currentStage);
    store.setEmotion("neutral");
  }, [store]);

  /**
   * End the session without going through the public `endSession` callback.
   * Used internally by the inactivity watcher to avoid circular dependencies.
   */
  const endSessionInternal = useCallback(() => {
    useRealtimeStore.getState().setConnectionState("ending");
    stopAllTimers();
    clientRef.current?.disconnect();
    clientRef.current = null;
    useRealtimeStore.getState().setConnectionState("ended");
  }, [stopAllTimers]);

  /**
   * Start a 5-minute inactivity watcher.
   * The clock starts fresh when this is called.
   * Only `store.resetActivity()` (called on every trainee message) resets it.
   */
  const startInactivityWatcher = useCallback(() => {
    store.resetActivity(); // stamp "now" as the baseline
    if (inactivityRef.current) clearInterval(inactivityRef.current);
    inactivityRef.current = setInterval(() => {
      const { lastActivityAt, connectionState } = useRealtimeStore.getState();
      if (connectionState !== "active") return;
      if (Date.now() - lastActivityAt > INACTIVITY_LIMIT_MS) {
        useRealtimeStore.getState().setTimedOut(true);
        endSessionInternal();
      }
    }, INACTIVITY_CHECK_MS);
  }, [store, endSessionInternal]);

  // ── Start session ──────────────────────────────────────
  const startSession = useCallback(async (config: RealtimeSessionConfig) => {
    store.reset();
    store.setConfig(config);
    store.setConnectionState("connecting");

    try {
      // 1. Get session token from backend
      const res = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json() as {
        sessionId?: string;
        ephemeralToken?: string | null;
        model?: string;
        mode?: "live" | "mock";
        warning?: string;
        error?: string;
        openingGreeting?: string;
      };

      if (!res.ok || data.error) {
        store.setError(data.error ?? "Failed to create session");
        store.setConnectionState("error");
        return;
      }

      openingGreetingRef.current = data.openingGreeting ?? "Hai, agen! Apakabar?";
      store.setSession(data.sessionId!, data.ephemeralToken ?? null);

      // ── MOCK MODE — no API key, run text simulation ────
      if (data.mode === "mock" || !data.ephemeralToken) {
        if (data.warning) {
          store.setError(data.warning);
        } else {
          store.setError("OPENAI_API_KEY is not configured on the server. Live voice mode requires a valid OpenAI API key.");
        }
        store.setConnectionState("error");
        return;
      }

      // ── LIVE MODE — WebRTC → OpenAI Realtime ──────────
      store.setMockMode(false);

      clientRef.current = new RealtimeClient({
        onConnected: () => {
          store.setConnectionState("active");
          startTimer();
          sendOpeningGreeting();
          startInactivityWatcher();
        },
        onDisconnected: () => {
          store.setConnectionState("ended");
          stopAllTimers();
        },
        onError: (message) => {
          store.setError(message);
          store.setConnectionState("error");
        },
        onTranscriptDelta: (role, delta, itemId) => {
          store.appendTranscriptDelta(role, delta, itemId);
        },
        onTranscriptDone: (role, text, itemId) => {
          store.finalizeTranscript(role, text, itemId, store.currentStage);
          // Reset inactivity timer whenever the trainee speaks
          if (role === "trainee") {
            store.resetActivity();
          }
          const lower = text.toLowerCase();
          if (role === "trainee" && (lower.includes("sesi selesai") || lower.includes("session ended"))) {
            void endSession();
          }
        },
        onSpeechStarted: (role) => {
          if (role === "ai_client") store.setAiSpeaking(true);
          else store.setUserSpeaking(true);
        },
        onSpeechStopped: (role) => {
          if (role === "ai_client") store.setAiSpeaking(false);
          else store.setUserSpeaking(false);
        },
        onEmotionDetected: (emotion) => store.setEmotion(emotion),
        onStageAdvanced: (stage) => store.setStage(stage),
      });

      // Pass the model so the SDP exchange URL uses the exact correct model ID
      await clientRef.current.connect(data.ephemeralToken, data.model ?? "gpt-realtime-2");
    } catch (err) {
      console.error("startSession error:", err);
      store.setError("Unexpected error starting session.");
      store.setConnectionState("error");
    }
  }, [store, startTimer, stopAllTimers, sendOpeningGreeting, startInactivityWatcher]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send mock message (text input in mock mode) ────────
  const sendMockMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const config = store.config;
    const lang = config?.lang ?? "id";

    // Reset inactivity timer on every trainee message
    store.resetActivity();

    // Add trainee message to transcript
    const traineeId = `trainee-${Date.now()}`;
    store.finalizeTranscript("trainee", text, traineeId, store.currentStage);
    store.setUserSpeaking(true);

    // Check for session end trigger
    const lower = text.toLowerCase();
    if (lower.includes("sesi selesai") || lower.includes("session ended")) {
      await endSession();
      return;
    }

    setTimeout(() => store.setUserSpeaking(false), 500);

    // Prepare AI response
    store.setAiSpeaking(true);
    const aiItemId = `ai-${Date.now()}`;

    // Normalize realtime stage keys → respond engine stage keys
    const engineStage = REALTIME_TO_ENGINE[store.currentStage] ?? "opening";
    const engineHistory = store.stageHistory.map((s) => REALTIME_TO_ENGINE[s] ?? s);

    try {
      const response = await fetch("/api/roleplay/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: store.sessionId ?? "mock-session",
          scenarioId: config?.scenarioId ?? "scenario-appointment-setting",
          personaId: "persona-tsing-lu",
          currentStage: engineStage,
          stageHistory: engineHistory,
          objectionHistory: store.objectionHistory,
          traineeMessage: text,
          conversation: store.transcript.map((m) => ({ role: m.role, content: m.text })),
          lang,
        }),
      });

      const data = await response.json() as {
        reply?: string;
        nextStage?: string;
        trustLevel?: number;
        error?: string;
      };

      // Use reply from engine, or a non-repeating contextual fallback
      const reply = (response.ok && data.reply)
        ? data.reply
        : lang === "id"
          ? "Bisa lebih spesifik? Saya butuh detail yang jelas."
          : "Can you be more specific? I need clear details.";

      // Stream word by word
      const words = reply.split(" ");
      let accumulated = "";
      for (const word of words) {
        accumulated += (accumulated ? " " : "") + word;
        store.appendTranscriptDelta("ai_client", accumulated === word ? word : " " + word, aiItemId);
        await new Promise((r) => setTimeout(r, 55));
      }

      store.finalizeTranscript("ai_client", reply, aiItemId, store.currentStage);

      // Map engine stage keys back → realtime stage keys and advance if needed
      if (data.nextStage) {
        const mapped = ENGINE_TO_REALTIME[data.nextStage] as Parameters<typeof store.setStage>[0] | undefined;
        if (mapped && mapped !== store.currentStage) {
          store.setStage(mapped);
        }
      }

      if (data.trustLevel !== undefined) {
        store.setTrust(data.trustLevel);
      }

      // Analyze emotion from Tsing Lu's reply
      const { emotionEngine } = await import("@/lib/realtime/emotion-engine");
      store.setEmotion(emotionEngine.analyze(reply));

    } catch (err) {
      console.error("sendMockMessage error:", err);
      const errReply = lang === "id"
        ? "Maaf, ada gangguan teknis sebentar."
        : "Sorry, there was a brief technical issue.";
      store.finalizeTranscript("ai_client", errReply, aiItemId, store.currentStage);
    } finally {
      store.setAiSpeaking(false);
    }
  }, [store]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Switch to mock mode ────────────────────────────────
  const switchToMockMode = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    store.setMockMode(true);
    store.setError(null);
    store.setAiSpeaking(false);
    store.setUserSpeaking(false);
    store.setMuted(false);
    store.setConnectionState("active");
    startTimer();
    sendOpeningGreeting();
    startInactivityWatcher();
  }, [store, startTimer, sendOpeningGreeting, startInactivityWatcher]);

  // ── End session ────────────────────────────────────────
  const endSession = useCallback(async () => {
    store.setConnectionState("ending");
    stopAllTimers();
    clientRef.current?.disconnect();
    clientRef.current = null;
    store.setConnectionState("ended");
  }, [store, stopAllTimers]);

  // ── Mute / Unmute ──────────────────────────────────────
  const toggleMute = useCallback(() => {
    const next = !store.isMuted;
    store.setMuted(next);
    if (next) clientRef.current?.mute();
    else clientRef.current?.unmute();
  }, [store]);

  // ── Cleanup on unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      stopAllTimers();
      clientRef.current?.disconnect();
    };
  }, [stopAllTimers]);

  return { startSession, endSession, toggleMute, sendMockMessage, switchToMockMode };
}
