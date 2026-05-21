"use client";

import { useRealtimeStore } from "@/stores/realtime-store";
import { REALTIME_STAGE_META } from "@/lib/realtime/session-orchestrator";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";

export function SessionPanel() {
  const { lang } = useI18n();
  const {
    config,
    currentStage,
    stageHistory,
    objectionHistory,
    trustLevel,
    elapsedSeconds,
    connectionState,
  } = useRealtimeStore();

  const stageMeta = REALTIME_STAGE_META[currentStage] ?? REALTIME_STAGE_META["opening"];
  const stageLabel = lang === "id" ? stageMeta.labelId : stageMeta.label;

  const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, "0");
  const seconds = (elapsedSeconds % 60).toString().padStart(2, "0");

  const allStages = Object.values(REALTIME_STAGE_META).sort((a, b) => a.order - b.order);
  const currentOrder = stageMeta.order;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Scenario objective */}
      {config && (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
          <p className="mb-1 text-xs uppercase tracking-wider text-blue-200/60">
            {lang === "id" ? "Skenario" : "Scenario"}
          </p>
          <p className="text-sm font-semibold text-white">{config.scenarioTitle}</p>
          <p className="mt-1 text-xs text-blue-100/80 leading-relaxed">{config.scenarioObjective}</p>
        </div>
      )}

      {/* Stage progress */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 space-y-2">
        <p className="text-xs uppercase tracking-wider text-blue-200/60">
          {lang === "id" ? "Tahap Saat Ini" : "Current Stage"}
        </p>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 text-xs font-semibold text-blue-300">
            {stageLabel}
          </span>
        </div>

        {/* Stage pipeline dots */}
        <div className="flex items-center gap-1 pt-1">
          {allStages.map((s, i) => {
            const completed = i < currentOrder;
            const active = i === currentOrder;
            return (
              <div key={s.label} className="flex items-center gap-1">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full transition-all duration-300",
                    completed ? "bg-blue-400" : active ? "bg-blue-400 ring-2 ring-blue-400/30 scale-125" : "bg-white/15"
                  )}
                />
                {i < allStages.length - 1 && (
                  <div className={cn("h-px w-3 transition-all", completed ? "bg-blue-400/60" : "bg-white/10")} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Trust meter */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-blue-200/60">
            {lang === "id" ? "Kepercayaan" : "Trust Level"}
          </p>
          <span className="text-xs font-semibold text-white">{trustLevel}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              trustLevel >= 70 ? "bg-emerald-400" : trustLevel >= 45 ? "bg-amber-400" : "bg-rose-400"
            )}
            style={{ width: `${trustLevel}%` }}
          />
        </div>
      </div>

      {/* Objection history */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 space-y-1.5 flex-1">
        <p className="text-xs uppercase tracking-wider text-blue-200/60">
          {lang === "id" ? "Keberatan" : "Objections"}
        </p>
        {objectionHistory.length === 0 ? (
          <p className="text-xs text-blue-100/40 italic">
            {lang === "id" ? "Belum ada keberatan" : "None raised yet"}
          </p>
        ) : (
          <ul className="space-y-1">
            {objectionHistory.map((obj, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-amber-300/90">
                <span className="mt-0.5 text-amber-400">⚠</span>
                {obj}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Timer + connection state */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              connectionState === "active" ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
            )}
          />
          <span className="text-xs text-blue-100/70">
            {connectionState === "connecting" ? (lang === "id" ? "Menghubungkan..." : "Connecting...")
              : connectionState === "active" ? (lang === "id" ? "Terhubung" : "Connected")
              : connectionState === "ending" ? (lang === "id" ? "Mengakhiri..." : "Ending...")
              : connectionState === "ended" ? (lang === "id" ? "Selesai" : "Ended")
              : connectionState === "error" ? (lang === "id" ? "Error" : "Error")
              : (lang === "id" ? "Siap" : "Ready")}
          </span>
        </div>
        <span className="font-mono text-sm font-semibold text-white">
          {minutes}:{seconds}
        </span>
      </div>
    </div>
  );
}
