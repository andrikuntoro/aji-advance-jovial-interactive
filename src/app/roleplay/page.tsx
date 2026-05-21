"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ChatPanel } from "@/components/roleplay/chat-panel";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_PERSONA, MVP_SCENARIOS } from "@/lib/mock-data";
import { STAGE_META } from "@/lib/scenario-engine";
import {
  ConversationMessage,
  RoleplayRespondResponse,
  RoleplayStage,
} from "@/types/domain";
import { formatSecondsToClock } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";

function createMessage(
  role: ConversationMessage["role"],
  content: string,
  sessionId: string
): ConversationMessage {
  return {
    id: crypto.randomUUID(),
    sessionId,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

const TIMER_INTERVAL_MS = 1000;
const PROGRESS_MAX_SECONDS = 600;

function RoleplayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, lang } = useI18n();
  const scenarioId = searchParams.get("scenarioId") || MVP_SCENARIOS[0].id;
  const debugMode = searchParams.get("debug") === "1";

  const scenario = useMemo(
    () => MVP_SCENARIOS.find((item) => item.id === scenarioId) ?? MVP_SCENARIOS[0],
    [scenarioId]
  );

  // Bilingual display data for this scenario
  const scenarioDisplay = useMemo(
    () => SCENARIO_DISPLAY[lang]?.[scenarioId] ?? SCENARIO_DISPLAY.en[scenarioId],
    [lang, scenarioId]
  );
  const personaOccupation = PERSONA_OCCUPATION[lang];

  // ── Session state ──────────────────────────────────────────
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionPersisted, setSessionPersisted] = useState(false);
  const sessionInitialized = useRef(false);

  // ── Conversation state ─────────────────────────────────────
  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  // ── Stage machine state ────────────────────────────────────
  const [currentStage, setCurrentStage] = useState<RoleplayStage>("opening");
  const [stageHistory, setStageHistory] = useState<RoleplayStage[]>(["opening"]);
  const [objectionHistory, setObjectionHistory] = useState<string[]>([]);
  const [trustLevel, setTrustLevel] = useState(30);
  const [stageRepeatCount, setStageRepeatCount] = useState(0);
  const [objectionStatus, setObjectionStatus] = useState("Pending");

  // ── Timer ──────────────────────────────────────────────────
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Initialize session on mount ────────────────────────────
  useEffect(() => {
    if (sessionInitialized.current) return;
    sessionInitialized.current = true;

    async function init() {
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "anonymous",
            scenarioId: scenario.id,
            personaId: DEFAULT_PERSONA.id,
          }),
        });
        const data = await res.json() as {
          sessionId: string;
          persisted: boolean;
          currentStage: RoleplayStage;
          stageHistory: RoleplayStage[];
          objectionHistory: string[];
          trustLevel: number;
        };

        setSessionId(data.sessionId);
        setSessionPersisted(data.persisted);
        setCurrentStage(data.currentStage ?? "opening");
        setStageHistory(data.stageHistory ?? ["opening"]);
        setObjectionHistory(data.objectionHistory ?? []);
        setTrustLevel(data.trustLevel ?? 30);

        // Set initial AI greeting
        setMessages([
          createMessage(
            "ai_client",
            getOpeningGreeting(scenario.type, lang),
            data.sessionId
          ),
        ]);
      } catch (err) {
        console.error("Failed to initialize session", err);
        const fallbackId = `local-${crypto.randomUUID()}`;
        setSessionId(fallbackId);
        setMessages([
          createMessage("ai_client", getOpeningGreeting(scenario.type, lang), fallbackId),
        ]);
      }
    }

    void init();
  }, [scenario.id, scenario.type, lang]);

  // ── Start timer once session is ready ─────────────────────
  useEffect(() => {
    if (!sessionId) return;
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), TIMER_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId]);

  // ── Persist state to DB after each turn (fire-and-forget) ──
  const persistState = useCallback(
    (
      id: string,
      next: RoleplayStage,
      history: RoleplayStage[],
      objHistory: string[],
      trust: number,
      repeatCount: number,
      isCompleted: boolean
    ) => {
      if (!sessionPersisted && !id.startsWith("local-")) return;
      if (id.startsWith("local-")) return; // No DB for local sessions

      void fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStage: next,
          nextStage: next,
          stageHistory: history,
          objectionHistory: objHistory,
          trustLevel: trust,
          stageRepeatCount: repeatCount,
          status: isCompleted ? "completed" : "active",
          debugState: {
            lastUpdated: new Date().toISOString(),
            debugMode,
          },
        }),
      }).catch(console.error);
    },
    [sessionPersisted, debugMode]
  );

  // ── Handle trainee message submission ──────────────────────
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!sessionId) return;

      const traineeMessage = createMessage("trainee", text, sessionId);
      const updated = [...messages, traineeMessage];
      setMessages(updated);

      const response = await fetch("/api/roleplay/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          scenarioId: scenario.id,
          personaId: DEFAULT_PERSONA.id,
          currentStage,
          stageHistory,
          objectionHistory,
          traineeMessage: text,
          conversation: updated.map((m) => ({ role: m.role, content: m.content })),
          debugMode,
          lang,
        }),
      });

      const data = (await response.json()) as RoleplayRespondResponse;

      const nextStage = data.nextStage ?? data.currentStage ?? currentStage;
      const newHistory = Array.isArray(data.stageHistory) ? data.stageHistory : stageHistory;
      const newObjHistory = Array.isArray(data.objectionHistory)
        ? data.objectionHistory
        : objectionHistory;
      const newTrust = data.trustLevel ?? trustLevel;

      // Compute repeat count for new stage
      const newRepeatCount = (() => {
        let count = 0;
        for (let i = newHistory.length - 1; i >= 0; i--) {
          if (newHistory[i] === nextStage) count++;
          else break;
        }
        return count;
      })();

      setCurrentStage(nextStage);
      setStageHistory(newHistory);
      setObjectionHistory(newObjHistory);
      setTrustLevel(newTrust);
      setStageRepeatCount(newRepeatCount);
      setObjectionStatus(data.objectionRaised ? "Raised" : "Addressed");

      // Persist to DB
      persistState(
        sessionId,
        nextStage,
        newHistory,
        newObjHistory,
        newTrust,
        newRepeatCount,
        nextStage === "completed"
      );

      setMessages((prev) => [...prev, createMessage("ai_client", data.reply, sessionId)]);

      // Auto-complete when stage reaches completed
      if (nextStage === "completed") {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    },
    [
      sessionId,
      messages,
      scenario.id,
      currentStage,
      stageHistory,
      objectionHistory,
      trustLevel,
      debugMode,
      persistState,
    ]
  );

  // ── End session → results page ─────────────────────────────
  const handleEndSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const payload = encodeURIComponent(
      JSON.stringify(messages.map((m) => ({ role: m.role, content: m.content })))
    );
    router.push(`/results?scenarioId=${scenario.id}&sessionId=${sessionId ?? ""}&transcript=${payload}`);
  }, [messages, router, scenario.id, sessionId]);

  const progressPercent = Math.min(100, Math.round((seconds / PROGRESS_MAX_SECONDS) * 100));

  // ── Loading state ──────────────────────────────────────────
  if (!sessionId) {
    return (
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-blue-400 animate-pulse" />
              <h2 className="text-lg font-semibold text-white">{t("roleplay.initializing")}</h2>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-100/90">{t("roleplay.preparing", { scenario: scenario.title, persona: DEFAULT_PERSONA.name })}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top row: scenario + persona info */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-white">{scenarioDisplay?.title ?? scenario.title}</h1>
                <p className="text-sm text-blue-100/90 mt-1">{scenarioDisplay?.objective ?? scenario.objective}</p>
              </div>
              <Badge>{t(`scenarios.difficulty.${scenario.difficulty}` as Parameters<typeof t>[0])}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(scenarioDisplay?.objections ?? scenario.commonObjections).map((item) => (
              <Badge key={item}>{item}</Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-sm text-blue-200/80">{t("roleplay.clientPersona")}</p>
            <h2 className="text-lg font-semibold text-white">{DEFAULT_PERSONA.name}</h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-100/90">
            <p>{personaOccupation} · {DEFAULT_PERSONA.age}</p>

            {/* Stage badge — debug only */}
            {debugMode && (
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-blue-300/60">{t("roleplay.currentStage")}</p>
                <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {t(`stage.${currentStage}` as Parameters<typeof t>[0]) || STAGE_META[currentStage].label}
                </Badge>
              </div>
            )}

            <Badge>{t("roleplay.trust")}: {trustLevel}%</Badge>

          </CardContent>
        </Card>
      </div>

      {/* Chat panel + optional debug stage tracker */}
      <ChatPanel
        messages={messages}
        onSendMessage={handleSendMessage}
        onEndSession={handleEndSession}
        timerText={formatSecondsToClock(seconds)}
        progressPercent={progressPercent}
        objectionStatus={objectionStatus}
        debugInfo={
          debugMode
            ? { currentStage, stageHistory, objectionHistory, trustLevel }
            : undefined
        }
      />
    </div>
  );
}

function RoleplayLoadingFallback() {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-white">Loading roleplay session...</h2>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-blue-100/90">Preparing scenario details and client context.</p>
      </CardContent>
    </Card>
  );
}

export default function RoleplayPage() {
  return (
    <AppShell>
      <Suspense fallback={<RoleplayLoadingFallback />}>
        <RoleplayContent />
      </Suspense>
    </AppShell>
  );
}

// ── Bilingual scenario display data ─────────────────────────────────────────
const SCENARIO_DISPLAY: Record<"en" | "id", Record<string, { title: string; objective: string; objections: string[] }>> = {
  en: {
    "scenario-appointment-setting": {
      title: "Appointment Setting",
      objective: "Open the conversation, introduce yourself, explain purpose, handle objections, and secure an appointment.",
      objections: ["I am busy", "I already have insurance", "Please send me the information first", "I am not interested now"],
    },
    "scenario-fact-finding": {
      title: "Fact Finding",
      objective: "Discover customer goals, financial priorities, family needs, protection gaps, and planning concerns.",
      objections: ["I don't want to share too much personal information", "I need to discuss with my spouse first", "Why do you need all these details?"],
    },
    "scenario-product-pitch": {
      title: "Product Pitch",
      objective: "Connect customer needs with suitable insurance solutions, explain benefits clearly, handle objections, and move toward a decision.",
      objections: ["This sounds expensive", "I'm not convinced this is necessary", "I need time to think"],
    },
  },
  id: {
    "scenario-appointment-setting": {
      title: "Appointment Setting",
      objective: "Buka percakapan, perkenalkan diri, jelaskan tujuan, tangani keberatan, dan amankan janji pertemuan.",
      objections: ["Saya sedang sibuk", "Saya sudah punya asuransi", "Kirimkan informasinya dulu saja", "Saya tidak tertarik sekarang"],
    },
    "scenario-fact-finding": {
      title: "Fact Finding",
      objective: "Gali tujuan nasabah, prioritas keuangan, kebutuhan keluarga, celah perlindungan, dan kekhawatiran perencanaan.",
      objections: ["Saya tidak mau berbagi terlalu banyak informasi pribadi", "Saya perlu diskusi dengan pasangan dulu", "Mengapa Anda butuh semua detail ini?"],
    },
    "scenario-product-pitch": {
      title: "Product Pitch",
      objective: "Hubungkan kebutuhan nasabah dengan solusi asuransi yang tepat, jelaskan manfaatnya dengan jelas, tangani keberatan, dan arahkan menuju keputusan.",
      objections: ["Ini kedengarannya mahal", "Saya tidak yakin ini perlu", "Saya butuh waktu untuk berpikir"],
    },
  },
};

const PERSONA_OCCUPATION: Record<"en" | "id", string> = {
  en: "Manufacturing business owner",
  id: "Pemilik bisnis manufaktur",
};

function getOpeningGreeting(
  type: "appointment_setting" | "fact_finding" | "product_pitch",
  lang: "en" | "id" = "en"
): string {
  if (lang === "id") {
    if (type === "appointment_setting") {
      return "Tsing Lu di sini. Saya hanya punya beberapa menit — ini ada keperluan apa?";
    }
    if (type === "fact_finding") {
      return "Halo. Saya bisa bicara sebentar, tapi mohon langsung ke intinya. Ada keperluan apa?";
    }
    return "Halo. Saya akan mendengarkan, tapi tolong yang relevan — saya tidak tertarik dengan penawaran yang terlalu umum.";
  }
  if (type === "appointment_setting") {
    return "Tsing Lu here. I only have a few minutes — what is this call about?";
  }
  if (type === "fact_finding") {
    return "Hello. I have a moment to talk, but I prefer practical, direct conversations. What is this about?";
  }
  return "Hello. I'll listen, but please keep it relevant — I'm not interested in a generic pitch.";
}
