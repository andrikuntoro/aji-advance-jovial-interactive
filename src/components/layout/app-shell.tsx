"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { TopNav } from "@/components/layout/top-nav";
import { useI18n } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  sidebar?: boolean;
}

export function AppShell({ children, sidebar = true }: AppShellProps) {
  const { t } = useI18n();

  const menu = [
    { href: "/dashboard", labelKey: "nav.dashboard" as const, icon: "📊", isSubMenu: false },
    { href: "/realtime", labelKey: "nav.realtime" as const, icon: "🎙️", isSubMenu: false },
    { href: "/scenarios", labelKey: "nav.roleplay" as const, icon: "💬", isSubMenu: true },
    { href: "/results", labelKey: "nav.results" as const, icon: "🏆", isSubMenu: false },
    { href: "/admin", labelKey: "nav.admin" as const, icon: "⚙️", isSubMenu: false },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(90%_70%_at_50%_0%,rgba(59,130,246,0.2),rgba(2,6,23,1))] text-white">
      <TopNav />
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {sidebar && (
          <aside className="hidden w-64 shrink-0 rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md lg:block">
            <p className="mb-4 text-xs uppercase tracking-[0.22em] text-blue-200/70">
              {t("nav.navigation")}
            </p>
            <nav className="space-y-1.5">
              {menu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-blue-100/90 transition-colors hover:bg-white/10 hover:text-white",
                    item.isSubMenu && "pl-8 text-xs text-blue-200/70 hover:text-blue-100"
                  )}
                >
                  {item.isSubMenu && (
                    <span className="text-xs text-blue-300/40 mr-1">↳</span>
                  )}
                  {item.icon && <span className="text-base leading-none">{item.icon}</span>}
                  {t(item.labelKey)}
                </Link>
              ))}
            </nav>
          </aside>
        )}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
