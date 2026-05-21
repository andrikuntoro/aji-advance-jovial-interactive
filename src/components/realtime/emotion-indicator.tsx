"use client";

import { EmotionState } from "@/types/domain";
import { EMOTION_CONFIG } from "@/lib/realtime/emotion-engine";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";

interface EmotionIndicatorProps {
  emotion: EmotionState;
  className?: string;
}

export function EmotionIndicator({ emotion, className }: EmotionIndicatorProps) {
  const { lang } = useI18n();
  const cfg = EMOTION_CONFIG[emotion];

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium backdrop-blur transition-all duration-500",
        cfg.color,
        "bg-black/30",
        className
      )}
    >
      <span className="text-base leading-none">{cfg.icon}</span>
      <span>{lang === "id" ? cfg.labelId : cfg.label}</span>
    </div>
  );
}
