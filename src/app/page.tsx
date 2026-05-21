"use client";

import Link from "next/link";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n-context";

export default function LandingPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-[radial-gradient(80%_70%_at_50%_0%,rgba(59,130,246,0.25),rgba(2,6,23,1))] text-white">
      <TopNav />
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div className="space-y-6">
          <p className="inline-flex rounded-full border border-blue-300/30 bg-blue-500/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-blue-100">
            {t("landing.eyebrow")}
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            {t("landing.headline")}
          </h1>
          <p className="max-w-xl text-blue-100/90">
            {t("landing.subheadline")}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/realtime">
              <Button>{t("landing.ctaStart")}</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary">{t("landing.ctaLogin")}</Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">{t("landing.features.title")}</h2>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-blue-100">
              <li>• {t("landing.features.1")}</li>
              <li>• {t("landing.features.2")}</li>
              <li>• {t("landing.features.3")}</li>
              <li>• {t("landing.features.4")}</li>
              <li>• {t("landing.features.5")}</li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
