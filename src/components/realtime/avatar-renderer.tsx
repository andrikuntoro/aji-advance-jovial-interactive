"use client";

/**
 * AvatarRenderer — Tsing Lu visual avatar component
 *
 * Shows a portrait of Tsing Lu with:
 * - Speaking animation ring
 * - Emotion border color
 * - Connection state overlay
 *
 * TODO:HeyGen — Replace the static portrait with HeyGen LiveAvatar stream:
 *   1. Receive heygenStreamUrl prop (injected from session orchestrator)
 *   2. Create <video> element with srcObject = HeyGen WebRTC stream
 *   3. Remove the static <img> placeholder
 *   4. HeyGen lip sync will drive the avatar movement automatically
 *   See: https://docs.heygen.com/reference/interactive-avatar-v2
 */

import { AvatarRendererProps } from "@/types/domain";
import { EMOTION_CONFIG } from "@/lib/realtime/emotion-engine";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";

export function AvatarRenderer({
  emotion,
  isSpeaking,
  connectionState,
  heygenStreamUrl, // TODO:HeyGen — will be populated once integration is active
  personaName = "Mature Persona",
  personaAge = 50,
  personaOccupation = "Manufacturing Owner",
}: AvatarRendererProps) {
  const { lang } = useI18n();
  const emotionCfg = EMOTION_CONFIG[emotion];
  const isConnecting = connectionState === "connecting";
  const isEnded = connectionState === "ended" || connectionState === "ending";
  const isError = connectionState === "error";

  const initials = personaName
    ? personaName
        .split(/\s+/)
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "MP";

  return (
    <div className="relative flex h-full min-h-[320px] flex-col items-center justify-center">
      {/* ── Avatar frame ─────────────────────────────── */}
      <div className="relative">
        {/* Speaking pulse rings */}
        {isSpeaking && (
          <>
            <span className="absolute inset-0 rounded-full animate-ping bg-blue-400/20 scale-110" />
            <span className="absolute inset-0 rounded-full animate-ping animation-delay-200 bg-blue-400/10 scale-125" />
          </>
        )}

        {/* Avatar circle */}
        <div
          className={cn(
            "relative w-44 h-44 rounded-full overflow-hidden border-4 transition-all duration-500",
            isSpeaking
              ? "border-blue-400 shadow-[0_0_32px_rgba(59,130,246,0.5)]"
              : `${emotionCfg.color} shadow-[0_0_16px_rgba(255,255,255,0.05)]`
          )}
        >
          {/*
           * TODO:HeyGen — Replace <img> below with:
           * <video
           *   autoPlay muted playsInline
           *   ref={(el) => { if (el && heygenStreamUrl) el.src = heygenStreamUrl; }}
           *   className="w-full h-full object-cover"
           * />
           *
           * When heygenStreamUrl is provided, HeyGen's LiveAvatar will
           * render Tsing Lu speaking with lip sync in this element.
           *
           * By default, we show a gorgeous dynamic color gradient placeholder.
           */}
          {heygenStreamUrl ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-xs text-blue-300">
              {/* TODO:HeyGen — Video element goes here */}
              HeyGen Stream
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
              {/* Custom avatar placeholder — stylized dynamic initials */}
              <div className="flex flex-col items-center gap-1">
                <div className="text-5xl font-bold text-white/90 tracking-tight">{initials}</div>
                <div className="text-xs text-blue-300/80 tracking-widest uppercase">{personaName}</div>
              </div>
            </div>
          )}

          {/* Overlay states */}
          {isConnecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="h-6 w-6 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
            </div>
          )}
          {isError && (
            <div className="absolute inset-0 flex items-center justify-center bg-rose-950/80">
              <span className="text-2xl">⚠️</span>
            </div>
          )}
          {isEnded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <span className="text-sm text-slate-400">
                {lang === "id" ? "Sesi selesai" : "Session ended"}
              </span>
            </div>
          )}
        </div>

        {/* Speaking badge */}
        {isSpeaking && !isEnded && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
            <span className="flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-400/40 px-3 py-1 text-xs text-blue-300 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              {lang === "id" ? "Sedang bicara..." : "Speaking..."}
            </span>
          </div>
        )}
      </div>

      {/* ── Persona label ─────────────────────────────── */}
      <div className="mt-6 text-center">
        <p className="text-base font-semibold text-white">{personaName}</p>
        <p className="text-xs text-blue-200/70">
          {lang === "id" ? `${personaOccupation} · ${personaAge} th` : `${personaOccupation} · ${personaAge} y/o`}
        </p>
      </div>

      {/*
       * TODO:HeyGen — Emotion expression API integration:
       * When emotion changes, call HeyGen expression API:
       * POST https://api.heygen.com/v1/realtime/avatar/expression
       * { avatar_id, expression: emotionToHeyGenExpression(emotion) }
       */}
    </div>
  );
}
