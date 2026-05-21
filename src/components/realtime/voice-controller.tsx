"use client";

import { useRealtimeStore } from "@/stores/realtime-store";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";

interface VoiceControllerProps {
  onToggleMute: () => void;
  onEndSession: () => void;
  personaName?: string;
}

export function VoiceController({ onToggleMute, onEndSession, personaName = "Mature Persona" }: VoiceControllerProps) {
  const { lang } = useI18n();
  const { isMuted, isUserSpeaking, isAiSpeaking, connectionState } = useRealtimeStore();

  const isActive = connectionState === "active";
  const isEnding = connectionState === "ending" || connectionState === "ended";

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-4 backdrop-blur">
      {/* Mute button */}
      <button
        onClick={onToggleMute}
        disabled={!isActive}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full border text-xl transition-all duration-200",
          isMuted
            ? "bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30"
            : isUserSpeaking
            ? "bg-blue-500/30 border-blue-400/50 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white",
          !isActive && "opacity-40 cursor-not-allowed"
        )}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? "🔇" : "🎙️"}
      </button>

      {/* Center status indicator */}
      <div className="flex flex-1 items-center justify-center gap-3">
        {isActive && (
          <>
            {isUserSpeaking ? (
              <div className="flex items-center gap-2">
                {/* Voice wave bars */}
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-0.5 rounded-full bg-blue-400 animate-pulse"
                    style={{
                      height: `${8 + Math.sin(i) * 8}px`,
                      animationDelay: `${i * 80}ms`,
                    }}
                  />
                ))}
                <span className="text-sm text-blue-300 ml-1">
                  {lang === "id" ? "Berbicara..." : "Speaking..."}
                </span>
              </div>
            ) : isAiSpeaking ? (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm text-emerald-300">
                  {lang === "id" ? `${personaName} berbicara...` : `${personaName} speaking...`}
                </span>
              </div>
            ) : isMuted ? (
              <span className="text-sm text-rose-400">
                {lang === "id" ? "Mikrofon dimatikan" : "Microphone muted"}
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-500 animate-pulse" />
                <span className="text-sm text-slate-400">
                  {lang === "id" ? "Mendengarkan..." : "Listening..."}
                </span>
              </div>
            )}
          </>
        )}

        {connectionState === "connecting" && (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
            <span className="text-sm text-blue-300">
              {lang === "id" ? "Menghubungkan..." : "Connecting..."}
            </span>
          </div>
        )}

        {connectionState === "error" && (
          <span className="text-sm text-rose-400">
            {lang === "id" ? "Koneksi gagal" : "Connection failed"}
          </span>
        )}
      </div>

      {/* End session button */}
      <button
        onClick={onEndSession}
        disabled={isEnding}
        className={cn(
          "flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all duration-200",
          isEnding
            ? "border-slate-600 bg-slate-800 text-slate-500 cursor-not-allowed"
            : "border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/60 hover:shadow-[0_0_16px_rgba(239,68,68,0.2)]"
        )}
      >
        <span>🔴</span>
        <span>{lang === "id" ? "Akhiri Sesi" : "End Session"}</span>
      </button>
    </div>
  );
}
