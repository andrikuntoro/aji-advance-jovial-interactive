"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n-context";

// ── Bilingual scenario data ──────────────────────────────────────────────────
const SCENARIOS_DATA = {
  en: [
    {
      id: "scenario-appointment-setting",
      title: "Appointment Setting",
      objective: "Open the conversation, introduce yourself, explain purpose, handle objections, and secure an appointment.",
      difficulty: "beginner",
      objections: ["I am busy", "I already have insurance", "Please send me the information first", "I am not interested now"],
    },
    {
      id: "scenario-fact-finding",
      title: "Fact Finding",
      objective: "Discover customer goals, financial priorities, family needs, protection gaps, and planning concerns.",
      difficulty: "intermediate",
      objections: ["I don't want to share too much personal information", "I need to discuss with my spouse first", "Why do you need all these details?"],
    },
    {
      id: "scenario-product-pitch",
      title: "Product Pitch",
      objective: "Connect customer needs with suitable insurance solutions, explain benefits clearly, handle objections, and move toward a decision.",
      difficulty: "advanced",
      objections: ["This sounds expensive", "I'm not convinced this is necessary", "I need time to think"],
    },
  ],
  id: [
    {
      id: "scenario-appointment-setting",
      title: "Appointment Setting",
      objective: "Buka percakapan, perkenalkan diri, jelaskan tujuan, tangani keberatan, dan amankan janji pertemuan.",
      difficulty: "beginner",
      objections: ["Saya sedang sibuk", "Saya sudah punya asuransi", "Kirimkan informasinya dulu saja", "Saya tidak tertarik sekarang"],
    },
    {
      id: "scenario-fact-finding",
      title: "Fact Finding",
      objective: "Gali tujuan nasabah, prioritas keuangan, kebutuhan keluarga, celah perlindungan, dan kekhawatiran perencanaan.",
      difficulty: "intermediate",
      objections: ["Saya tidak mau berbagi terlalu banyak informasi pribadi", "Saya perlu diskusi dengan pasangan dulu", "Mengapa Anda butuh semua detail ini?"],
    },
    {
      id: "scenario-product-pitch",
      title: "Product Pitch",
      objective: "Hubungkan kebutuhan nasabah dengan solusi asuransi yang tepat, jelaskan manfaatnya dengan jelas, tangani keberatan, dan arahkan menuju keputusan.",
      difficulty: "advanced",
      objections: ["Ini kedengarannya mahal", "Saya tidak yakin ini perlu", "Saya butuh waktu untuk berpikir"],
    },
  ],
};

export default function ScenariosPage() {
  const { t, lang } = useI18n();
  const scenarios = SCENARIOS_DATA[lang];

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <p className="text-sm text-blue-200/80">{t("scenarios.eyebrow")}</p>
          <h1 className="text-3xl font-semibold text-white">{t("scenarios.title")}</h1>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {scenarios.map((scenario) => (
            <Card key={scenario.id}>
              <CardHeader className="space-y-2">
                <Badge>
                  {t(`scenarios.difficulty.${scenario.difficulty}` as Parameters<typeof t>[0])}
                </Badge>
                <h2 className="text-xl font-semibold text-white">{scenario.title}</h2>
                <p className="text-sm text-blue-100/90">{scenario.objective}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-blue-200/70">
                    {t("scenarios.objections")}
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-blue-100/90">
                    {scenario.objections.map((objection) => (
                      <li key={objection}>{objection}</li>
                    ))}
                  </ul>
                </div>
                <Link href={`/roleplay?scenarioId=${scenario.id}`} className="inline-flex w-full">
                  <Button className="w-full">
                    {t("scenarios.start")} {scenario.title}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
