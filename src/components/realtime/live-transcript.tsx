"use client";

import { useEffect, useRef } from "react";
import { useRealtimeStore } from "@/stores/realtime-store";
import { REALTIME_STAGE_META } from "@/lib/realtime/session-orchestrator";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";

export function LiveTranscript() {
  const { lang } = useI18n();
  const { transcript, streamingAiText, isAiSpeaking } = useRealtimeStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, streamingAiText]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <p className="mb-2 text-xs uppercase tracking-wider text-blue-200/60 flex-shrink-0">
        {lang === "id" ? "Transkrip Langsung" : "Live Transcript"}
      </p>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-white/10">
        {transcript.length === 0 && !streamingAiText && (
          <p className="text-xs text-blue-100/30 italic text-center mt-8">
            {lang === "id"
              ? "Percakapan akan muncul di sini..."
              : "Conversation will appear here..."}
          </p>
        )}

        {transcript.map((entry) => {
          const isAI = entry.role === "ai_client";
          const stageLabel = REALTIME_STAGE_META[entry.stage]?.[lang === "id" ? "labelId" : "label"];

          return (
            <div key={entry.id} className={cn("flex gap-2", isAI ? "flex-row" : "flex-row-reverse")}>
              {/* Role avatar dot */}
              <div
                className={cn(
                  "mt-1 h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold",
                  isAI
                    ? "bg-slate-700 text-blue-300"
                    : "bg-blue-600 text-white"
                )}
              >
                {isAI ? "TL" : "A"}
              </div>

              <div className={cn("max-w-[85%] space-y-1", isAI ? "" : "items-end flex flex-col")}>
                {/* Stage label (tiny) */}
                {stageLabel && (
                  <span className="text-[10px] text-blue-300/40 px-1">{stageLabel}</span>
                )}

                {/* Message bubble */}
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    isAI
                      ? "bg-slate-800/80 text-blue-50 rounded-tl-sm"
                      : "bg-blue-600/20 border border-blue-500/20 text-blue-100 rounded-tr-sm"
                  )}
                >
                  {entry.text}
                </div>
              </div>
            </div>
          );
        })}

        {/* Streaming AI response */}
        {streamingAiText && (
          <div className="flex gap-2">
            <div className="mt-1 h-6 w-6 flex-shrink-0 rounded-full bg-slate-700 text-blue-300 flex items-center justify-center text-xs font-bold">
              TL
            </div>
            <div className="max-w-[85%]">
              <div className="rounded-2xl rounded-tl-sm bg-slate-800/80 px-3 py-2 text-sm text-blue-50 leading-relaxed">
                {streamingAiText}
                <span className="inline-block w-0.5 h-3.5 bg-blue-400 animate-pulse ml-0.5 align-middle" />
              </div>
            </div>
          </div>
        )}

        {/* AI thinking indicator */}
        {isAiSpeaking && !streamingAiText && (
          <div className="flex gap-2">
            <div className="mt-1 h-6 w-6 flex-shrink-0 rounded-full bg-slate-700 text-blue-300 flex items-center justify-center text-xs font-bold">
              TL
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-slate-800/80 px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
