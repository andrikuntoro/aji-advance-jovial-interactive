"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n-context";
import ContextManager from "@/components/admin/context-manager";

const trainees = [
  { name: "Alicia Tan", sessions: 14, avgScore: 80 },
  { name: "Marcus Lim", sessions: 20, avgScore: 85 },
  { name: "Nadia Wong", sessions: 9, avgScore: 77 },
];

const recentSessions = [
  { id: "S-1004", trainee: "Alicia Tan", scenario: "Appointment Setting", score: 83, status: "Completed" },
  { id: "S-1005", trainee: "Marcus Lim", scenario: "Fact Finding", score: 88, status: "Completed" },
  { id: "S-1006", trainee: "Nadia Wong", scenario: "Product Pitch", score: 75, status: "Completed" },
];

interface ConfigStatus {
  openai: { configured: boolean; valid: boolean; mode: string; label: string };
  supabase: { configured: boolean; label: string };
  realtimeVoice: { available: boolean; label: string };
}

function IntegrationStatusPanel() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);

  useEffect(() => {
    fetch("/api/admin/config-status")
      .then((r) => r.json())
      .then((d) => setStatus(d as ConfigStatus))
      .catch(() => setStatus(null));
  }, []);

  if (!status) return null;

  const items = [
    {
      key: "openai",
      icon: status.openai.valid ? "🤖" : "⚠️",
      title: "OpenAI API",
      label: status.openai.label,
      active: status.openai.valid,
      action: !status.openai.valid ? {
        text: "Cara Aktivasi",
        steps: [
          "Buka: https://platform.openai.com/api-keys",
          "Klik \"Create new secret key\"",
          "Copy key (format: sk-proj-...)",
          "Paste ke .env.local → OPENAI_API_KEY=sk-proj-...",
          "Restart: npm run dev",
        ],
      } : null,
    },
    {
      key: "voice",
      icon: status.realtimeVoice.available ? "🎙️" : "🔇",
      title: "Realtime Voice",
      label: status.realtimeVoice.label,
      active: status.realtimeVoice.available,
      action: null,
    },
    {
      key: "supabase",
      icon: status.supabase.configured ? "🗄️" : "💾",
      title: "Supabase DB",
      label: status.supabase.label,
      active: status.supabase.configured,
      action: null,
    },
  ];

  const allActive = items.every((i) => i.active);

  return (
    <Card className={`border-2 ${allActive ? "border-emerald-500/30" : "border-amber-500/30"}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">🛠️ Status Integrasi Platform</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            allActive ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
          }`}>
            {allActive ? "Semua Aktif" : "Setup Diperlukan"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.key}
            className={`rounded-xl border px-4 py-3 ${
              item.active
                ? "border-emerald-500/20 bg-emerald-950/30"
                : "border-amber-500/20 bg-amber-950/20"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-xl">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    item.active
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-amber-500/20 text-amber-300"
                  }`}>
                    {item.active ? "Aktif" : "Tidak Aktif"}
                  </span>
                </div>
                <p className="text-xs text-blue-100/70">{item.label}</p>

                {item.action && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-amber-300 hover:text-amber-200 font-medium">
                      {item.action.text} ▸
                    </summary>
                    <ol className="mt-2 space-y-1">
                      {item.action.steps.map((step, i) => (
                        <li key={i} className="flex gap-2 text-xs text-blue-100/80">
                          <span className="shrink-0 w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">
                            {i + 1}
                          </span>
                          <span className="font-mono">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}

        {!status.openai.valid && (
          <div className="mt-2 rounded-xl border border-blue-500/20 bg-blue-950/30 p-3">
            <p className="text-xs font-semibold text-blue-300 mb-1">📋 File yang perlu diedit:</p>
            <code className="block text-xs text-emerald-300 bg-black/40 rounded-lg p-2 font-mono">
              .env.local<br />
              <span className="text-slate-400"># Tambahkan key Anda di bawah ini:</span><br />
              OPENAI_API_KEY=sk-proj-...key-anda...
            </code>
            <p className="mt-2 text-xs text-blue-100/60">
              Setelah menyimpan, restart server dengan <code className="text-emerald-300">npm run dev</code>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { t } = useI18n();

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <p className="text-sm text-blue-200/80">{t("admin.eyebrow")}</p>
          <h1 className="text-3xl font-semibold text-white">{t("admin.title")}</h1>
        </div>

        {/* Integration Status — shown first so admin always sees setup state */}
        <IntegrationStatusPanel />

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { labelKey: "admin.totalTrainees" as const, value: "32" },
            { labelKey: "admin.totalSessions" as const, value: "246" },
            { labelKey: "admin.avgScore" as const, value: "81" },
          ].map((kpi) => (
            <Card key={kpi.labelKey}>
              <CardHeader>
                <p className="text-sm text-blue-200/80">{t(kpi.labelKey)}</p>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-white">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Dynamic Context Editor Section */}
        <ContextManager />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">{t("admin.trainees")}</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trainees.map((user) => (
                  <div
                    key={user.name}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-blue-100"
                  >
                    <p>{user.name}</p>
                    <p>
                      {user.sessions} {t("admin.sessions")} · {t("admin.avg")} {user.avgScore}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">{t("admin.recentSessions")}</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-blue-100"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">{session.trainee}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        session.score >= 80 ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                      }`}>
                        {session.score}
                      </span>
                    </div>
                    <p className="text-blue-100/60 text-xs">{session.scenario} · {session.status}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
