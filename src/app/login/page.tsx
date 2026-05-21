"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-context";

export default function LoginPage() {
  const { t } = useI18n();

  return (
    <AppShell sidebar={false}>
      <div className="mx-auto max-w-md py-8">
        <Card>
          <CardHeader>
            <p className="text-sm text-blue-200/80">{t("login.eyebrow")}</p>
            <h1 className="text-2xl font-semibold text-white">{t("login.title")}</h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-blue-100">{t("login.email")}</label>
              <input
                type="email"
                placeholder="agent@company.com"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-blue-100">{t("login.password")}</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Link href="/dashboard" className="text-xs text-blue-200/80 hover:text-white">
                {t("login.demo")}
              </Link>
              <Button>{t("login.submit")}</Button>
            </div>
            <p className="text-xs text-blue-200/60">{t("login.placeholder")}</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
