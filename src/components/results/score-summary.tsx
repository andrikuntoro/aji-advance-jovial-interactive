"use client";

import { ScoreReport } from "@/types/domain";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";

interface ScoreSummaryProps {
  report: Omit<ScoreReport, "id" | "createdAt">;
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-rose-400";
  const ringColor =
    score >= 80
      ? "stroke-emerald-400"
      : score >= 60
      ? "stroke-amber-400"
      : "stroke-rose-400";
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-700", ringColor)}
        />
      </svg>
      <span className={cn("absolute text-2xl font-bold", color)}>{score}</span>
    </div>
  );
}

export function ScoreSummary({ report }: ScoreSummaryProps) {
  const { t } = useI18n();

  // Safety guard — should not happen with fixed results page, but prevents crash
  if (!report || typeof report.overallScore === "undefined") {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-blue-100/80">Score report unavailable.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Overall score */}
      <Card className="lg:col-span-1 flex flex-col items-center justify-center py-4">
        <CardHeader className="text-center">
          <p className="text-sm text-blue-200/80">{t("results.overallScore")}</p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <ScoreRing score={report.overallScore} />
          <Badge>{t("results.mode")}: {report.sessionId?.slice(0, 8) ?? "—"}</Badge>
        </CardContent>
      </Card>

      {/* Category scores */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <h3 className="text-lg font-semibold text-white">Category Scores</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(report.categories ?? []).map((category) => (
              <div
                key={category.key}
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-blue-100">{category.label}</p>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      category.score >= 80
                        ? "text-emerald-400"
                        : category.score >= 60
                        ? "text-amber-400"
                        : "text-rose-400"
                    )}
                  >
                    {category.score}/100
                  </p>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      category.score >= 80
                        ? "bg-emerald-400"
                        : category.score >= 60
                        ? "bg-amber-400"
                        : "bg-rose-400"
                    )}
                    style={{ width: `${category.score}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-blue-200/80">{category.feedback}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strengths */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-white">{t("results.strengths")}</h3>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-blue-100">
            {(report.strengths ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Improvement areas */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-white">{t("results.improvements")}</h3>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-blue-100">
            {(report.improvementAreas ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Next practice */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-white">{t("results.nextPractice")}</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-blue-100">{report.nextRecommendedPractice}</p>
          {report.suggestedBetterResponse && (
            <div className="rounded-xl border border-blue-300/20 bg-blue-400/10 p-3">
              <p className="mb-1 text-xs uppercase tracking-wider text-blue-300/60">
                {t("results.betterResponse")}
              </p>
              <p className="text-xs text-blue-100">{report.suggestedBetterResponse}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
