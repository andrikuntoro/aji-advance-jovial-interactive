"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-context";

const FRONTEND_URL = "https://aji-frontend--aji-ai-roleplay-2026.asia-southeast1.hosted.app";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const trimmedEmail = email.trim().toLowerCase();
      
      if (trimmedEmail === "admin@aji.com" && password === "admin123") {
        localStorage.setItem("aji_user", JSON.stringify({ email: trimmedEmail, role: "superadmin" }));
        router.push("/admin");
      } else {
        // Automatically route to Frontend if they are trying to login as member
        // Also inform them that members login via the frontend portal
        window.location.href = `${FRONTEND_URL}/login?email=${encodeURIComponent(trimmedEmail)}`;
      }
    }, 800);
  };

  return (
    <AppShell sidebar={false}>
      <div className="mx-auto max-w-md py-12">
        <Card className="border border-white/10 bg-slate-950/60 backdrop-blur-md">
          <CardHeader>
            <p className="text-sm text-blue-300 font-semibold uppercase tracking-wider">PORTAL SUPERADMIN</p>
            <h1 className="text-3xl font-extrabold text-white mt-1">Masuk Dashboard</h1>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-blue-100">{t("login.email")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@aji.com"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-blue-100">{t("login.password")}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
                  required
                />
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <Button type="submit" disabled={isLoading} className="w-full py-2.5">
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Memproses...</span>
                    </div>
                  ) : (
                    "Masuk Admin"
                  )}
                </Button>
                
                <div className="flex flex-col items-center gap-2 mt-4">
                  <div className="text-xs text-blue-200/60">
                    Akses Member / Pendaftaran AAJI?
                  </div>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    className="w-full text-xs py-2 border-blue-500/30 hover:bg-blue-500/10 text-blue-300"
                    onClick={() => window.location.href = `${FRONTEND_URL}/login`}
                  >
                    Masuk Portal Member
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

