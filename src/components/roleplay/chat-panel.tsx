"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ConversationMessage, RoleplayStage } from "@/types/domain";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StageTracker } from "@/components/roleplay/stage-tracker";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";

interface ChatPanelProps {
  messages: ConversationMessage[];
  onSendMessage: (value: string) => Promise<void>;
  onEndSession: () => void;
  timerText: string;
  progressPercent: number;
  objectionStatus: string;
  /** If provided, debug panel is shown (admin/debug mode only) */
  debugInfo?: {
    currentStage: RoleplayStage;
    stageHistory: RoleplayStage[];
    objectionHistory: string[];
    trustLevel: number;
  };
}

export function ChatPanel({
  messages,
  onSendMessage,
  onEndSession,
  timerText,
  progressPercent,
  objectionStatus,
  debugInfo,
}: ChatPanelProps) {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages]
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sorted.length]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    setInput("");
    setIsSending(true);
    try {
      await onSendMessage(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSend();
    }
  };

  const objectionLabel =
    objectionStatus === "Raised"
      ? t("roleplay.objectionRaised")
      : objectionStatus === "Addressed"
      ? t("roleplay.objectionAddressed")
      : t("roleplay.objectionPending");

  const objectionColor =
    objectionStatus === "Raised"
      ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
      : objectionStatus === "Addressed"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : "bg-white/10 text-blue-200/80 border-white/10";

  return (
    <div className={cn("grid gap-4", debugInfo ? "lg:grid-cols-[1fr_300px]" : "")}>
      {/* Main chat card */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-blue-200/80">{t("roleplay.eyebrow")}</p>
              <h2 className="text-lg font-semibold text-white">{t("roleplay.panelTitle")}</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge>
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {timerText}
              </Badge>
              <Badge className={cn("border", objectionColor)}>
                {t("roleplay.objection")}: {objectionLabel}
              </Badge>
              <Badge>{t("roleplay.progress")}: {progressPercent}%</Badge>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {/* Messages */}
          <div ref={scrollRef} className="h-[360px] space-y-3 overflow-y-auto pr-1 scroll-smooth">
            {sorted.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  message.role === "trainee"
                    ? "ml-auto bg-blue-600 text-white"
                    : message.role === "ai_client"
                    ? "bg-slate-800 text-blue-100"
                    : "mx-auto bg-white/10 text-blue-100/90"
                )}
              >
                {message.role === "ai_client" && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400/70 mb-1">
                    Client
                  </p>
                )}
                {message.role === "trainee" && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200/70 mb-1 text-right">
                    You
                  </p>
                )}
                {message.content}
              </div>
            ))}

            {/* Sending indicator */}
            {isSending && (
              <div className="max-w-[85%] rounded-2xl bg-slate-800 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400/70 mb-1">
                  Client
                </p>
                <div className="flex gap-1.5 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-2 w-2 rounded-full bg-blue-400/60 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
            <textarea
              id="chat-input"
              className="h-24 w-full resize-none rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-blue-200/40 focus:border-blue-400 transition-colors"
              placeholder={t("roleplay.inputPlaceholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
            />
            <div className="mt-3 flex items-center justify-between">
              <Button id="btn-end-session" variant="danger" onClick={onEndSession} disabled={isSending}>
                {t("roleplay.endSession")}
              </Button>
              <Button
                id="btn-send-message"
                onClick={() => void handleSend()}
                disabled={isSending || !input.trim()}
              >
                {isSending ? t("roleplay.sending") : t("roleplay.send")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug panel — admin only */}
      {debugInfo && (
        <div className="lg:block">
          <StageTracker
            currentStage={debugInfo.currentStage}
            stageHistory={debugInfo.stageHistory}
            objectionHistory={debugInfo.objectionHistory}
            trustLevel={debugInfo.trustLevel}
          />
        </div>
      )}
    </div>
  );
}
