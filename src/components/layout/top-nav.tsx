"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-context";

export function TopNav() {
  const { t, lang, setLang } = useI18n();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ── Logo ─────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-0 group">
          <div className="relative h-12 w-40 shrink-0">
            <Image
              src="/aji-logo.png"
              alt="AJI – Advance Jovial Interactive"
              fill
              className="object-contain object-left drop-shadow-[0_0_8px_rgba(59,130,246,0.3)] transition-all duration-300 group-hover:drop-shadow-[0_0_14px_rgba(59,130,246,0.55)]"
              priority
            />
          </div>
        </Link>

        {/* ── Center Nav ───────────────────────────── */}
        <nav className="hidden items-center gap-3 md:flex">
          <Link href="/" className="text-sm text-blue-100/90 hover:text-white transition-colors">
            {t("nav.home")}
          </Link>
          <Link href="/dashboard" className="text-sm text-blue-100/90 hover:text-white transition-colors">
            {t("nav.dashboard")}
          </Link>
          <Link href="/admin" className="text-sm text-blue-100/90 hover:text-white transition-colors">
            {t("nav.admin")}
          </Link>
          <Link href="/realtime" className="text-sm text-blue-100/90 hover:text-white transition-colors flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t("nav.realtime")}
          </Link>
          <Badge>{t("brand.badge")}</Badge>
        </nav>

        {/* ── Right Actions ────────────────────────── */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <div className="flex items-center rounded-xl border border-white/10 bg-white/5 p-0.5">
            <button
              onClick={() => setLang("en")}
              aria-label="Switch to English"
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${
                lang === "en"
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-blue-200/70 hover:text-white"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("id")}
              aria-label="Switch to Bahasa Indonesia"
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${
                lang === "id"
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-blue-200/70 hover:text-white"
              }`}
            >
              ID
            </button>
          </div>

          <Link href="/login">
            <Button variant="ghost" className="hidden sm:inline-flex">
              {t("nav.login")}
            </Button>
          </Link>
          <Link href="/realtime">
            <Button>{t("nav.startTraining")}</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
