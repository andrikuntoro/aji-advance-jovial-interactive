"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n-context";
import { useRealtimeStore } from "@/stores/realtime-store";
import { useRealtimeSession } from "@/hooks/use-realtime-session";
import { AvatarRenderer } from "@/components/realtime/avatar-renderer";
import { EmotionIndicator } from "@/components/realtime/emotion-indicator";
import { LiveTranscript } from "@/components/realtime/live-transcript";
import { SessionPanel } from "@/components/realtime/session-panel";
import { VoiceController } from "@/components/realtime/voice-controller";
import { MVP_SCENARIOS } from "@/lib/mock-data";
import { RealtimeSessionConfig } from "@/types/domain";
import Image from "next/image";
import Link from "next/link";
import { MicCheckModal } from "@/components/realtime/mic-check-modal";

// ─────────────────────────────────────────────────────────
// Bilingual scenario display data
// ─────────────────────────────────────────────────────────

const SCENARIO_DISPLAY_ID: Record<string, { title: string; objective: string }> = {
  "scenario-appointment-setting": {
    title: "Appointment Setting",
    objective: "Buka percakapan, perkenalkan diri, tangani keberatan, dan amankan janji pertemuan.",
  },
  "scenario-fact-finding": {
    title: "Fact Finding",
    objective: "Gali tujuan nasabah, prioritas keuangan, dan kebutuhan proteksi.",
  },
  "scenario-product-pitch": {
    title: "Product Pitch",
    objective: "Hubungkan produk asuransi dengan kebutuhan spesifik dan arahkan menuju keputusan.",
  },
};

// ─────────────────────────────────────────────────────────
// Scenario selector overlay (pre-session)
// ─────────────────────────────────────────────────────────

function ScenarioSelector({
  onStart,
  customContext,
}: {
  onStart: (config: RealtimeSessionConfig) => Promise<void>;
  customContext?: any;
}) {
  const { lang } = useI18n();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("scenarioId");
  const [selected, setSelected] = useState(preselectedId ?? "scenario-appointment-setting");
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  /** Controls the mic-check modal gate before session start */
  const [showMicCheck, setShowMicCheck] = useState(false);

  // Opens the mic-check modal instead of starting directly
  const handleClickStart = useCallback(() => {
    setStartError(null);
    setShowMicCheck(true);
  }, []);

  // Called by MicCheckModal when user confirms mic is ready
  const handleMicConfirmed = useCallback(async () => {
    setShowMicCheck(false);
    const scenario = MVP_SCENARIOS.find((s) => s.id === selected) ?? MVP_SCENARIOS[0];
    const display = lang === "id" ? SCENARIO_DISPLAY_ID[selected] : null;
    setIsStarting(true);
    setStartError(null);
    try {
      await onStart({
        scenarioId: scenario.id,
        scenarioType: scenario.type,
        scenarioTitle: display?.title ?? scenario.title,
        scenarioObjective: display?.objective ?? scenario.objective,
        lang,
      });
    } catch {
      setStartError(
        lang === "id"
          ? "Gagal memulai sesi. Periksa OPENAI_API_KEY dan koneksi internet."
          : "Failed to start session. Check OPENAI_API_KEY and internet connection."
      );
      setIsStarting(false);
    }
  }, [selected, lang, onStart]);

  const activePersonaName = customContext?.persona?.name ?? "Mature Persona";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-6">
      {/* Mic check modal — shown before session starts */}
      {showMicCheck && (
        <MicCheckModal
          onConfirm={() => void handleMicConfirmed()}
          onCancel={() => setShowMicCheck(false)}
        />
      )}

      <div className="w-full max-w-2xl space-y-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <Image src="/aji-logo.png" alt="AJI" width={40} height={40} className="rounded-lg" onError={() => {}} />
          <div>
            <p className="text-xs text-blue-300/70 uppercase tracking-widest">AJI · Advance Jovial Interactive</p>
            <h1 className="text-xl font-bold text-white">
              {lang === "id" ? "Roleplay Realtime" : "Realtime Roleplay"}
            </h1>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">
              {lang === "id" ? "Pilih Skenario" : "Select Scenario"}
            </h2>
            <p className="text-sm text-blue-100/60">
              {lang === "id"
                ? `Anda akan berbicara langsung dengan ${activePersonaName} melalui suara. Berbicaralah secara natural dalam bahasa Indonesia.`
                : `You'll speak directly with ${activePersonaName} via voice. Speak naturally.`}
            </p>
          </div>

          {/* Scenario cards */}
          <div className="space-y-3">
            {MVP_SCENARIOS.map((scenario) => {
              const display = lang === "id" ? SCENARIO_DISPLAY_ID[scenario.id] : null;
              const title = display?.title ?? scenario.title;
              const objective = display?.objective ?? scenario.objective;
              const isSelected = selected === scenario.id;

              return (
                <button
                  key={scenario.id}
                  onClick={() => setSelected(scenario.id)}
                  className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
                    isSelected
                      ? "border-blue-400/60 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{title}</p>
                      <p className="mt-1 text-xs text-blue-100/70 leading-relaxed">{objective}</p>
                    </div>
                    <span className={`text-xs rounded-full px-2 py-0.5 border flex-shrink-0 ${
                      scenario.difficulty === "beginner"
                        ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                        : scenario.difficulty === "intermediate"
                        ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                        : "border-rose-500/30 text-rose-400 bg-rose-500/10"
                    }`}>
                      {scenario.difficulty === "beginner"
                        ? lang === "id" ? "Pemula" : "Beginner"
                        : scenario.difficulty === "intermediate"
                        ? lang === "id" ? "Menengah" : "Intermediate"
                        : lang === "id" ? "Lanjutan" : "Advanced"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mic info */}
          <div className="rounded-xl border border-blue-300/20 bg-blue-500/5 p-3 flex items-start gap-3">
            <span className="text-lg">🎙️</span>
            <p className="text-xs text-blue-100/80 leading-relaxed">
              {lang === "id"
                ? "Izin mikrofon diperlukan. Berbicara langsung dalam Bahasa Indonesia. Ucapkan \"Sesi selesai\" atau tekan tombol merah untuk mengakhiri."
                : "Microphone permission required. Speak naturally in Indonesian. Say \"Sesi selesai\" or press the red button to end."}
            </p>
          </div>

          {/* Error message */}
          {startError && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 flex items-start gap-2">
              <span className="text-rose-400 text-base flex-shrink-0">⚠️</span>
              <p className="text-sm text-rose-300">{startError}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleClickStart}
              disabled={isStarting}
              className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 transition-all duration-200 shadow-[0_0_24px_rgba(59,130,246,0.3)] hover:shadow-[0_0_32px_rgba(59,130,246,0.4)] flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {isStarting ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  {lang === "id" ? "Menghubungkan..." : "Connecting..."}
                </>
              ) : (
                <>
                  <span>🎙️</span>
                  {lang === "id" ? "Mulai Realtime (Suara)" : "Start Realtime (Voice)"}
                </>
              )}
            </button>
            <Link
              href={`/roleplay?scenarioId=${selected}`}
              className="flex-1 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-semibold py-3.5 transition-all duration-200 flex items-center justify-center gap-2 text-center text-sm"
            >
              <span>💬</span>
              {lang === "id" ? "Chat Interaktif (Teks)" : "Chat Interactive (Text)"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Active session — premium video call UI
// ─────────────────────────────────────────────────────────

function ActiveSession({ onGoBack, customContext }: { onGoBack: () => void; customContext?: any }) {
  const router = useRouter();
  const { lang } = useI18n();
  const { endSession, toggleMute, sendMockMessage } = useRealtimeSession();
  const { connectionState, emotion, isAiSpeaking, transcript, error, config, isMockMode } = useRealtimeStore();
  const [mockInput, setMockInput] = useState("");
  const [mockSending, setMockSending] = useState(false);

  const scenarioId = config?.scenarioId ?? "scenario-appointment-setting";

  const handleEndSession = useCallback(async () => {
    await endSession();
    const payload = encodeURIComponent(
      JSON.stringify(
        transcript.map((m) => ({ role: m.role, content: m.text }))
      )
    );
    router.push(`/results?scenarioId=${scenarioId}&sessionId=realtime&transcript=${payload}`);
  }, [endSession, router, transcript, scenarioId]);

  // Auto-redirect when session ends naturally or via timeout
  useEffect(() => {
    if (connectionState === "ended") {
      const { timedOut } = useRealtimeStore.getState();
      if (timedOut) {
        // Inactivity timeout — no transcript, score will be 0
        router.push(`/results?scenarioId=${scenarioId}&sessionId=realtime&timeout=1`);
      } else {
        const payload = encodeURIComponent(
          JSON.stringify(transcript.map((m) => ({ role: m.role, content: m.text })))
        );
        router.push(`/results?scenarioId=${scenarioId}&sessionId=realtime&transcript=${payload}`);
      }
    }
  }, [connectionState, router, transcript, scenarioId]);

  // ── Error state: show full-page error with back option ──
  if (connectionState === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-5 text-center">
          <div className="text-5xl">⚠️</div>
          <h2 className="text-2xl font-bold text-white">
            {lang === "id" ? "Koneksi Gagal" : "Connection Failed"}
          </h2>
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-left">
            <p className="text-sm text-rose-300 mb-2 font-semibold">
              {lang === "id" ? "Detail Error:" : "Error Detail:"}
            </p>
            <p className="text-sm text-rose-200/80 font-mono">{error}</p>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-left space-y-2">
            <p className="text-sm font-semibold text-amber-300">
              {lang === "id" ? "Kemungkinan Penyebab:" : "Likely Causes:"}
            </p>
            <ul className="text-xs text-amber-200/80 space-y-1 list-disc pl-4">
              <li>{lang === "id" ? "OPENAI_API_KEY belum dikonfigurasi di .env.local" : "OPENAI_API_KEY not configured in .env.local"}</li>
              <li>{lang === "id" ? "API key tidak valid atau kehabisan quota" : "API key is invalid or out of quota"}</li>
              <li>{lang === "id" ? "Izin mikrofon ditolak oleh browser" : "Microphone permission denied by browser"}</li>
              <li>{lang === "id" ? "Koneksi internet tidak stabil" : "Unstable internet connection"}</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={onGoBack}
              className="w-full rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold py-3 transition-all"
            >
              {lang === "id" ? "← Kembali ke Pemilihan Skenario" : "← Back to Scenario Selection"}
            </button>
            <Link
              href="/roleplay"
              className="w-full rounded-xl border border-blue-400/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-semibold py-3 transition-all text-center"
            >
              {lang === "id" ? "Gunakan Mode Teks" : "Use Text Mode Instead"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-6 py-3 backdrop-blur flex-shrink-0">
        <div className="flex items-center gap-3">
          <Image src="/aji-logo.png" alt="AJI" width={32} height={32} className="rounded-lg" onError={() => {}} />
          <span className="text-sm font-semibold text-white">AJI Realtime</span>
          <span className="text-slate-600">·</span>
          <span className="text-sm text-blue-300/80">{customContext?.persona?.name ?? "Mature Persona"}</span>
        </div>
        {connectionState === "connecting" && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-1">
            <div className="h-3 w-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
            <span className="text-xs text-blue-300">
              {lang === "id" ? "Memulai sesi..." : "Starting session..."}
            </span>
          </div>
        )}
        {connectionState === "active" && (
          <div className="flex items-center gap-2">
            {isMockMode ? (
              <div className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs text-amber-300">
                  {lang === "id" ? "Mode Simulasi (Teks)" : "Simulation Mode (Text)"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-300">
                  {lang === "id" ? "Live · Suara Realtime" : "Live · Realtime Voice"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 gap-0">
        {/* LEFT — Avatar + Emotion */}
        <div className="flex w-72 flex-col border-r border-white/10 bg-slate-950/40 p-4 gap-4 flex-shrink-0">
          <AvatarRenderer
            emotion={emotion}
            isSpeaking={isAiSpeaking}
            connectionState={connectionState}
            personaName={customContext?.persona?.name}
            personaAge={customContext?.persona?.age}
            personaOccupation={customContext?.persona?.occupation}
          />
          <EmotionIndicator emotion={emotion} className="justify-center" />
        </div>

        {/* CENTER — Live transcript */}
        <div className="flex flex-1 flex-col min-w-0 p-4">
          <LiveTranscript />
        </div>

        {/* RIGHT — Session panel */}
        <div className="flex w-72 flex-col border-l border-white/10 bg-slate-950/40 p-4 flex-shrink-0">
          <SessionPanel />
        </div>
      </div>

      {/* BOTTOM — Voice controls OR Mock text input */}
      <div className="border-t border-white/10 bg-slate-950/80 p-4 backdrop-blur flex-shrink-0">
        {isMockMode ? (
          // ── Mock text input (no mic / no API key) ──
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2">
              <span className="text-amber-400 text-xs flex-shrink-0">📝</span>
              <input
                type="text"
                value={mockInput}
                onChange={(e) => setMockInput(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && !mockSending) {
                    e.preventDefault();
                    const text = mockInput.trim();
                    if (!text) return;
                    setMockInput("");
                    setMockSending(true);
                    await sendMockMessage(text);
                    setMockSending(false);
                  }
                }}
                disabled={mockSending || isAiSpeaking}
                placeholder={lang === "id" ? "Ketik respons Anda lalu Enter... (Mode Simulasi)" : "Type your response then Enter... (Simulation Mode)"}
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
              />
              {(mockSending || isAiSpeaking) && (
                <div className="h-3 w-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin flex-shrink-0" />
              )}
            </div>
            <button
              onClick={async () => {
                const text = mockInput.trim();
                if (!text || mockSending) return;
                setMockInput("");
                setMockSending(true);
                await sendMockMessage(text);
                setMockSending(false);
              }}
              disabled={!mockInput.trim() || mockSending || isAiSpeaking}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 text-sm font-semibold transition-all"
            >
              {lang === "id" ? "Kirim" : "Send"}
            </button>
            <button
              onClick={handleEndSession}
              className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-4 py-2 text-sm font-semibold transition-all"
            >
              🔴 {lang === "id" ? "Akhiri" : "End"}
            </button>
          </div>
        ) : (
          <VoiceController
            onToggleMute={toggleMute}
            onEndSession={handleEndSession}
            personaName={customContext?.persona?.name}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Page root — controls which view is shown
// ─────────────────────────────────────────────────────────

function RealtimeContent() {
  // "idle" = scenario selector, "starting" = connecting, "active" = in session
  const [view, setView] = useState<"selector" | "session">("selector");
  const { startSession } = useRealtimeSession();
  const { connectionState, reset } = useRealtimeStore();
  const [customContext, setCustomContext] = useState<any>(null);

  useEffect(() => {
    async function fetchContext() {
      try {
        const res = await fetch("/api/admin/context");
        if (res.ok) {
          const data = await res.json();
          setCustomContext(data);
        }
      } catch (err) {
        console.error("Failed to fetch custom context", err);
      }
    }
    void fetchContext();
  }, []);

  const handleStart = useCallback(
    async (config: RealtimeSessionConfig) => {
      // Switch to session view immediately so user sees connecting animation
      setView("session");
      await startSession(config);
      // If it failed, the session view will show the error + back button
    },
    [startSession]
  );

  const handleGoBack = useCallback(() => {
    reset();
    setView("selector");
  }, [reset]);

  // If error state, ActiveSession handles the back button
  if (view === "selector") {
    return <ScenarioSelector onStart={handleStart} customContext={customContext} />;
  }

  return <ActiveSession onGoBack={handleGoBack} customContext={customContext} />;
}

export default function RealtimePage() {
  return (
    <Suspense>
      <RealtimeContent />
    </Suspense>
  );
}
