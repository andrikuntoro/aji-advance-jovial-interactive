"use client";

import { RoleplayStage } from "@/types/domain";
import { STAGE_META, STAGE_ORDER } from "@/lib/scenario-engine";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";

interface StageTrackerProps {
  currentStage: RoleplayStage;
  stageHistory: RoleplayStage[];
  objectionHistory: string[];
  trustLevel: number;
}

const STAGE_COLORS: Record<RoleplayStage, string> = {
  opening: "bg-blue-500",
  permission_to_continue: "bg-indigo-500",
  needs_exploration: "bg-violet-500",
  objection_triggered: "bg-rose-500",
  value_reframe: "bg-amber-500",
  appointment_or_next_step: "bg-emerald-500",
  closing: "bg-teal-500",
  completed: "bg-green-500",
};

const STAGE_GLOW: Record<RoleplayStage, string> = {
  opening: "shadow-blue-500/60",
  permission_to_continue: "shadow-indigo-500/60",
  needs_exploration: "shadow-violet-500/60",
  objection_triggered: "shadow-rose-500/60",
  value_reframe: "shadow-amber-500/60",
  appointment_or_next_step: "shadow-emerald-500/60",
  closing: "shadow-teal-500/60",
  completed: "shadow-green-500/60",
};

const STAGE_TEXT: Record<RoleplayStage, string> = {
  opening: "text-blue-300",
  permission_to_continue: "text-indigo-300",
  needs_exploration: "text-violet-300",
  objection_triggered: "text-rose-300",
  value_reframe: "text-amber-300",
  appointment_or_next_step: "text-emerald-300",
  closing: "text-teal-300",
  completed: "text-green-300",
};

function TrustBar({ level, label }: { level: number; label: string }) {
  const color =
    level < 35
      ? "bg-rose-500"
      : level < 55
      ? "bg-amber-400"
      : level < 75
      ? "bg-emerald-400"
      : "bg-teal-400";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-blue-300/70 uppercase tracking-wider font-medium">{label}</span>
        <span className="font-bold text-white">{level}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${level}%` }}
        />
      </div>
    </div>
  );
}

export function StageTracker({
  currentStage,
  stageHistory,
  objectionHistory,
  trustLevel,
}: StageTrackerProps) {
  const { t } = useI18n();
  const visitedSet = new Set(stageHistory);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-md p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
          {t("debug.label")}
        </p>
      </div>

      {/* Trust bar */}
      <TrustBar level={trustLevel} label={t("debug.trustLevel")} />

      {/* Stage pipeline */}
      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-wider text-blue-300/60 font-medium">{t("debug.stagePipeline")}</p>
        <div className="space-y-1">
          {STAGE_ORDER.map((stage) => {
            const meta = STAGE_META[stage];
            const isActive = stage === currentStage;
            const isVisited = visitedSet.has(stage) && stage !== currentStage;
            const isPending = !visitedSet.has(stage);

            return (
              <div
                key={stage}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all duration-300",
                  isActive
                    ? "bg-white/10 border border-white/20"
                    : isVisited
                    ? "bg-white/5"
                    : "opacity-40"
                )}
              >
                {/* Dot */}
                <div
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full",
                    isActive
                      ? cn(STAGE_COLORS[stage], "shadow-lg animate-pulse", STAGE_GLOW[stage])
                      : isVisited
                      ? "bg-white/40"
                      : "bg-white/15"
                  )}
                />

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-xs font-medium truncate",
                      isActive
                        ? STAGE_TEXT[stage]
                        : isVisited
                        ? "text-white/60"
                        : "text-white/30"
                    )}
                  >
                    {t(`stage.${stage}` as Parameters<typeof t>[0]) || meta.label}
                  </p>
                </div>

                {/* State badge */}
                {isActive && (
                  <span className="shrink-0 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/80">
                    {t("debug.active")}
                  </span>
                )}
                {isVisited && !isActive && (
                  <span className="shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-white/30">
                    {t("debug.done")}
                  </span>
                )}
                {isPending && (
                  <span className="shrink-0 text-[10px] text-white/20">{t("debug.pending")}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage history breadcrumb */}
      {stageHistory.length > 1 && (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-blue-300/60 font-medium">
            {t("debug.stageJourney")}
          </p>
          <div className="flex flex-wrap gap-1">
            {stageHistory.map((stage, i) => (
              <span
                key={`${stage}-${i}`}
                className={cn(
                  "rounded-lg px-2 py-0.5 text-[10px] font-medium",
                  stage === currentStage
                    ? cn(STAGE_COLORS[stage], "text-white")
                    : "bg-white/10 text-white/50"
                )}
              >
                {t(`stage.${stage}` as Parameters<typeof t>[0]) || STAGE_META[stage].label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Objection history */}
      {objectionHistory.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-rose-300/70 font-medium">
            {t("debug.objectionsRaised")} ({objectionHistory.length})
          </p>
          <div className="space-y-1">
            {objectionHistory.map((objection, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5"
              >
                <span className="text-rose-400 mt-0.5 shrink-0">⚠</span>
                <p className="text-xs text-rose-200/80 leading-relaxed">"{objection}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
