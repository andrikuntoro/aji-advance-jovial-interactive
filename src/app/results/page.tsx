"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ScoreSummary } from "@/components/results/score-summary";
import { DEFAULT_PERSONA, MVP_SCENARIOS } from "@/lib/mock-data";
import { RoleplayScoreResponse } from "@/types/domain";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n-context";

function ResultsContent() {
  const searchParams = useSearchParams();
  const { t, lang } = useI18n();

  const scenarioId = searchParams.get("scenarioId") || MVP_SCENARIOS[0].id;
  const encodedTranscript = searchParams.get("transcript");
  /** True when the session ended automatically due to inactivity */
  const isTimeout = searchParams.get("timeout") === "1";

  const scenario = useMemo(
    () => MVP_SCENARIOS.find((item) => item.id === scenarioId) ?? MVP_SCENARIOS[0],
    [scenarioId]
  );

  const transcript = useMemo(() => {
    if (!encodedTranscript) return [];
    try {
      return JSON.parse(decodeURIComponent(encodedTranscript));
    } catch {
      return [];
    }
  }, [encodedTranscript]);

  const [report, setReport] = useState<RoleplayScoreResponse["report"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Shared helper: build a zero-score report without calling the API
  const buildZeroReport = useCallback(
    (sessionId: string) => {
      const zeroCategories = [
        { key: "communication_clarity" as const, label: lang === "id" ? "Kejelasan Komunikasi"  : "Communication Clarity", score: 0, feedback: lang === "id" ? "Tidak ada percakapan dalam sesi ini." : "No conversation took place in this session." },
        { key: "rapport_building"      as const, label: lang === "id" ? "Membangun Hubungan"    : "Building Rapport",       score: 0, feedback: lang === "id" ? "Tidak ada percakapan dalam sesi ini." : "No conversation took place in this session." },
        { key: "empathy"               as const, label: lang === "id" ? "Empati"                : "Empathy",                score: 0, feedback: lang === "id" ? "Tidak ada percakapan dalam sesi ini." : "No conversation took place in this session." },
        { key: "needs_discovery"       as const, label: lang === "id" ? "Penemuan Kebutuhan"    : "Needs Discovery",        score: 0, feedback: lang === "id" ? "Tidak ada percakapan dalam sesi ini." : "No conversation took place in this session." },
        { key: "objection_handling"    as const, label: lang === "id" ? "Penanganan Keberatan"  : "Objection Handling",     score: 0, feedback: lang === "id" ? "Tidak ada percakapan dalam sesi ini." : "No conversation took place in this session." },
        { key: "product_explanation"   as const, label: lang === "id" ? "Penjelasan Produk"     : "Product Explanation",    score: 0, feedback: lang === "id" ? "Tidak ada percakapan dalam sesi ini." : "No conversation took place in this session." },
        { key: "closing_ability"       as const, label: lang === "id" ? "Kemampuan Menutup"     : "Closing Ability",        score: 0, feedback: lang === "id" ? "Tidak ada percakapan dalam sesi ini." : "No conversation took place in this session." },
        { key: "compliance_awareness"  as const, label: lang === "id" ? "Kesadaran Kepatuhan"   : "Compliance Awareness",   score: 0, feedback: lang === "id" ? "Tidak ada percakapan dalam sesi ini." : "No conversation took place in this session." },
      ];
      return {
        sessionId,
        scenarioId,
        personaId: DEFAULT_PERSONA.id,
        overallScore: 0,
        categories: zeroCategories,
        strengths: [],
        improvementAreas: [
          lang === "id"
            ? "Mulai percakapan segera setelah sesi dimulai — balas sapaan AI untuk membuka sesi."
            : "Start the conversation immediately after the session begins — respond to the AI greeting to open the session.",
        ],
        nextRecommendedPractice:
          lang === "id"
            ? "Coba lagi dan buka percakapan dengan sapaan dan perkenalan diri dalam 30 detik pertama."
            : "Try again and open with a greeting and self-introduction within the first 30 seconds.",
        suggestedBetterResponse:
          lang === "id"
            ? '"Selamat siang, Pak Tsing! Saya [nama] dari [perusahaan]. Apakah Bapak punya 5 menit untuk saya?"\''
            : '"Good afternoon, Mr. Tsing! I\'m [name] from [company]. Do you have 5 minutes for me?"',
      } as RoleplayScoreResponse["report"];
    },
    [lang, scenarioId]
  );

  useEffect(() => {
    const sessionId = searchParams.get("sessionId") ?? "unknown";

    // ── Path 1: Inactivity timeout → zero score, no API call ──────
    if (isTimeout) {
      setReport({
        ...buildZeroReport(sessionId),
        improvementAreas: [
          lang === "id"
            ? "Mulai percakapan segera setelah sesi dimulai."
            : "Start the conversation immediately after the session begins.",
        ],
        nextRecommendedPractice:
          lang === "id"
            ? "Coba lagi dan buka percakapan dengan prospek dalam 30 detik pertama."
            : "Try again and open the conversation with the prospect within the first 30 seconds.",
      });
      setLoading(false);
      return;
    }

    // ── Path 2: No trainee messages → zero score, no API call ─────
    const traineeMessages = transcript.filter(
      (m: { role: string; content: string }) =>
        m.role === "trainee" && m.content.trim() !== "" && m.content !== "(no messages)"
    );
    if (traineeMessages.length === 0) {
      setReport(buildZeroReport(sessionId));
      setLoading(false);
      return;
    }

    // ── Path 3: Normal — call scoring API ─────────────────────────
    async function runScoring() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/roleplay/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            scenarioId: scenario.id,
            personaId: DEFAULT_PERSONA.id,
            transcript,
            lang,
          }),
        });
        const data = (await response.json()) as RoleplayScoreResponse & { error?: string };
        if (!response.ok || data.error) {
          setError(data.error ?? "Failed to generate score.");
        } else if (data.report) {
          setReport(data.report);
        } else {
          setError("Score report was empty.");
        }
      } catch (err) {
        console.error("Scoring fetch error", err);
        setError("Network error while generating score.");
      } finally {
        setLoading(false);
      }
    }
    void runScoring();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id, isTimeout, transcript.length]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-blue-200/80" suppressHydrationWarning>{t("results.eyebrow")}</p>
        <h1 className="text-3xl font-semibold text-white" suppressHydrationWarning>
          {t("results.title")} {scenario.title}
        </h1>
      </div>

      {/* Timeout warning banner */}
      {isTimeout && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">⏱️</span>
          <div>
            <p className="font-semibold text-amber-300" suppressHydrationWarning>
              {lang === "id" ? "Sesi Berakhir Otomatis" : "Session Auto-Ended"}
            </p>
            <p className="mt-1 text-sm text-amber-200/80" suppressHydrationWarning>
              {lang === "id"
                ? "Sesi roleplay dihentikan karena tidak ada aktivitas selama 5 menit. Semua skor ditetapkan 0. Silakan mulai ulang dan langsung berinteraksi setelah sesi dimulai."
                : "The roleplay session was stopped because there was no activity for 5 minutes. All scores are set to 0. Please restart and interact immediately after the session begins."}
            </p>
          </div>
        </div>
      )}

      {/* Empty transcript banner (session ended without any trainee messages) */}
      {!isTimeout && !loading && report && report.overallScore === 0 && transcript.filter(
        (m: { role: string }) => m.role === "trainee"
      ).length === 0 && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">💬</span>
          <div>
            <p className="font-semibold text-rose-300" suppressHydrationWarning>
              {lang === "id" ? "Tidak Ada Percakapan" : "No Conversation Detected"}
            </p>
            <p className="mt-1 text-sm text-rose-200/80" suppressHydrationWarning>
              {lang === "id"
                ? "Sesi berakhir tanpa ada pesan dari Anda. Semua skor ditetapkan 0. Setelah AI menyapa, segera balas untuk memulai roleplay."
                : "The session ended without any messages from you. All scores are set to 0. After the AI greets you, reply immediately to start the roleplay."}
            </p>
          </div>
        </div>
      )}

      {loading && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white" suppressHydrationWarning>{t("results.generating")}</h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-100/90" suppressHydrationWarning>{t("results.generatingDesc")}</p>
          </CardContent>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-rose-400">Error</h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-100/90">{error}</p>
          </CardContent>
        </Card>
      )}

      {!loading && report && <ScoreSummary report={report} />}
    </div>
  );
}

function ResultsLoadingFallback() {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-white">Loading session results...</h2>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-blue-100/90">Preparing transcript and scoring context.</p>
      </CardContent>
    </Card>
  );
}

export default function ResultsPage() {
  return (
    <AppShell>
      <Suspense fallback={<ResultsLoadingFallback />}>
        <ResultsContent />
      </Suspense>
    </AppShell>
  );
}
