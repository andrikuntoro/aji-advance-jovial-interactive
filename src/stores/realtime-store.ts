/**
 * AJI Realtime Zustand Store
 *
 * Single source of truth for the entire realtime session state.
 * Updated by the WebRTC client callbacks and the realtime page.
 */

import { create } from "zustand";
import {
  EmotionState,
  LiveTranscriptEntry,
  RealtimeConnectionState,
  RealtimeSessionConfig,
  RealtimeStage,
} from "@/types/domain";

interface RealtimeStore {
  // ── Connection ──────────────────────────────────────
  connectionState: RealtimeConnectionState;
  sessionId: string | null;
  ephemeralToken: string | null;
  config: RealtimeSessionConfig | null;
  isMockMode: boolean;

  // ── Conversation ────────────────────────────────────
  transcript: LiveTranscriptEntry[];
  currentStage: RealtimeStage;
  stageHistory: RealtimeStage[];
  objectionHistory: string[];
  trustLevel: number;

  // ── Emotion & Speaking ──────────────────────────────
  emotion: EmotionState;
  isAiSpeaking: boolean;
  isUserSpeaking: boolean;
  isMuted: boolean;

  // ── Live streaming text ─────────────────────────────
  /** Partial AI response being streamed in real-time */
  streamingAiText: string;
  streamingItemId: string | null;

  // ── Timer ───────────────────────────────────────────
  elapsedSeconds: number;

  // ── Inactivity / timeout ────────────────────────────
  /** Unix timestamp of the last trainee activity (message sent / voice). */
  lastActivityAt: number;
  /** True when the session ended automatically due to inactivity. */
  timedOut: boolean;

  // ── Error ───────────────────────────────────────────
  error: string | null;

  // ── Actions ─────────────────────────────────────────
  setConnectionState: (state: RealtimeConnectionState) => void;
  setSession: (sessionId: string, token: string | null) => void;
  setConfig: (config: RealtimeSessionConfig) => void;
  setMockMode: (mock: boolean) => void;
  setStage: (stage: RealtimeStage) => void;
  setEmotion: (emotion: EmotionState) => void;
  setAiSpeaking: (speaking: boolean) => void;
  setUserSpeaking: (speaking: boolean) => void;
  setMuted: (muted: boolean) => void;
  setError: (error: string | null) => void;
  setTrust: (level: number) => void;
  tickTimer: () => void;
  /** Update lastActivityAt to now — called whenever the trainee sends a message. */
  resetActivity: () => void;
  /** Mark the session as timed-out (inactivity). */
  setTimedOut: (value: boolean) => void;

  /** Append or update a transcript delta (streaming) */
  appendTranscriptDelta: (role: "trainee" | "ai_client", delta: string, itemId: string) => void;

  /** Finalize a transcript entry */
  finalizeTranscript: (role: "trainee" | "ai_client", text: string, itemId: string, stage: RealtimeStage) => void;

  addObjection: (objection: string) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  connectionState: "idle" as RealtimeConnectionState,
  sessionId: null,
  ephemeralToken: null,
  config: null,
  isMockMode: false,
  transcript: [] as LiveTranscriptEntry[],
  currentStage: "opening" as RealtimeStage,
  stageHistory: ["opening"] as RealtimeStage[],
  objectionHistory: [] as string[],
  trustLevel: 28,
  emotion: "neutral" as EmotionState,
  isAiSpeaking: false,
  isUserSpeaking: false,
  isMuted: false,
  streamingAiText: "",
  streamingItemId: null,
  elapsedSeconds: 0,
  lastActivityAt: 0,
  timedOut: false,
  error: null,
};

export const useRealtimeStore = create<RealtimeStore>((set, get) => ({
  ...INITIAL_STATE,

  setConnectionState: (state) => set({ connectionState: state }),

  setSession: (sessionId, ephemeralToken) => set({ sessionId, ephemeralToken }),

  setConfig: (config) => set({ config }),

  setMockMode: (mock: boolean) => set({ isMockMode: mock }),

  setStage: (stage) =>
    set((s) => ({
      currentStage: stage,
      stageHistory: [...s.stageHistory, stage],
      // Bump trust slightly on positive stage transitions
      trustLevel: Math.min(
        95,
        s.trustLevel +
          (stage === "rapport_building" || stage === "needs_exploration" ? 5
            : stage === "value_reframe" ? 8
            : stage === "closing" ? 10
            : 0)
      ),
    })),

  setEmotion: (emotion) => set({ emotion }),

  setAiSpeaking: (isAiSpeaking) => set({ isAiSpeaking }),

  setUserSpeaking: (isUserSpeaking) => set({ isUserSpeaking }),

  setMuted: (isMuted) => set({ isMuted }),

  setError: (error) => set({ error }),

  setTrust: (trustLevel) => set({ trustLevel }),

  tickTimer: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),

  resetActivity: () => set({ lastActivityAt: Date.now() }),

  setTimedOut: (value) => set({ timedOut: value }),

  appendTranscriptDelta: (role, delta, itemId) =>
    set((s) => {
      if (role !== "ai_client") return s;
      // Only stream AI text in the streaming buffer
      const isSameItem = s.streamingItemId === itemId;
      return {
        streamingAiText: isSameItem ? s.streamingAiText + delta : delta,
        streamingItemId: itemId,
      };
    }),

  finalizeTranscript: (role, text, itemId, stage) =>
    set((s) => {
      const newEntry: LiveTranscriptEntry = {
        id: itemId,
        role,
        text,
        timestamp: Date.now(),
        stage,
        isFinal: true,
      };
      // Replace or append
      const exists = s.transcript.some((e) => e.id === itemId);
      const transcript = exists
        ? s.transcript.map((e) => (e.id === itemId ? newEntry : e))
        : [...s.transcript, newEntry];

      return {
        transcript,
        // Clear streaming buffer when this item is done
        streamingAiText: s.streamingItemId === itemId ? "" : s.streamingAiText,
        streamingItemId: s.streamingItemId === itemId ? null : s.streamingItemId,
      };
    }),

  addObjection: (objection) =>
    set((s) => ({
      objectionHistory: [...s.objectionHistory, objection],
      trustLevel: Math.max(10, s.trustLevel - 5),
    })),

  reset: () => set(INITIAL_STATE),
}));
