"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-context";

export default function DashboardPage() {
  const { t } = useI18n();

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <p className="text-sm text-blue-200/80">{t("dashboard.eyebrow")}</p>
          <h1 className="text-3xl font-semibold text-white">{t("dashboard.title")}</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { labelKey: "dashboard.sessionsCompleted" as const, value: "18" },
            { labelKey: "dashboard.averageScore" as const, value: "82" },
            { labelKey: "dashboard.currentFocus" as const, value: t("dashboard.objectionHandling") },
          ].map((item) => (
            <Card key={item.labelKey}>
              <CardHeader>
                <p className="text-sm text-blue-200/80">{t(item.labelKey)}</p>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-white">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">{t("dashboard.nextAction")}</h2>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-blue-100">{t("dashboard.nextActionDesc")}</p>
            <Link href="/realtime">
              <Button>{t("dashboard.chooseScenario")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
