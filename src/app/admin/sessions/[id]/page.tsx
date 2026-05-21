import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STAGE_META, STAGE_ORDER } from "@/lib/scenario-engine";
import { RoleplayStage } from "@/types/domain";
import { cn } from "@/lib/utils";

interface SessionData {
  id: string;
  scenario_id: string;
  persona_id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  current_stage: RoleplayStage;
  stage_history: RoleplayStage[];
  objection_history: string[];
  trust_level: number;
  stage_repeat_count: number;
  debug_state: Record<string, unknown>;
  conversation_messages: Array<{
    id: string;
    role: string;
    content: string;
    stage_at_time: RoleplayStage | null;
    created_at: string;
  }>;
}

async function getSession(id: string): Promise<SessionData | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/sessions/${id}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return await res.json() as SessionData;
  } catch {
    return null;
  }
}

const STAGE_DOT_COLOR: Record<RoleplayStage, string> = {
  opening: "bg-blue-500",
  permission_to_continue: "bg-indigo-500",
  needs_exploration: "bg-violet-500",
  objection_triggered: "bg-rose-500",
  value_reframe: "bg-amber-500",
  appointment_or_next_step: "bg-emerald-500",
  closing: "bg-teal-500",
  completed: "bg-green-500",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminSessionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession(id);

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-blue-200/80">Admin · Session Detail</p>
            <h1 className="text-3xl font-semibold text-white">Session {id.slice(0, 8)}…</h1>
          </div>
          {session && (
            <Badge
              className={cn(
                "border",
                session.status === "completed"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/30"
              )}
            >
              {session.status.toUpperCase()}
            </Badge>
          )}
        </div>

        {!session ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-blue-100/70">
                Session not found. Database may not be configured, or the session ID is invalid.
              </p>
              <p className="mt-2 text-xs text-blue-200/50">ID: {id}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Session meta */}
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: "Scenario", value: session.scenario_id },
                { label: "Persona", value: session.persona_id },
                {
                  label: "Started",
                  value: new Date(session.started_at).toLocaleString(),
                },
                {
                  label: "Trust Level",
                  value: `${session.trust_level}%`,
                },
              ].map((item) => (
                <Card key={item.label}>
                  <CardHeader>
                    <p className="text-xs uppercase tracking-wider text-blue-300/60">{item.label}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-semibold text-white truncate">{item.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Stage Journey */}
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold text-white">Stage Journey</h2>
                  <p className="text-sm text-blue-200/70">
                    {session.stage_history.length} transitions recorded
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* Stage pipeline overview */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {STAGE_ORDER.map((stage) => {
                      const visited = session.stage_history.includes(stage);
                      const isCurrent = session.current_stage === stage;
                      return (
                        <div
                          key={stage}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs",
                            isCurrent
                              ? "bg-white/15 border border-white/20 text-white font-semibold"
                              : visited
                              ? "bg-white/8 text-white/60"
                              : "bg-transparent text-white/25"
                          )}
                        >
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full shrink-0",
                              visited ? STAGE_DOT_COLOR[stage] : "bg-white/20"
                            )}
                          />
                          {STAGE_META[stage].label}
                        </div>
                      );
                    })}
                  </div>

                  {/* History list */}
                  <div className="space-y-1.5">
                    {session.stage_history.map((stage, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2"
                      >
                        <div
                          className={cn(
                            "h-2.5 w-2.5 shrink-0 rounded-full",
                            STAGE_DOT_COLOR[stage]
                          )}
                        />
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium">
                            {STAGE_META[stage].label}
                          </p>
                          <p className="text-xs text-blue-200/50">
                            {STAGE_META[stage].description}
                          </p>
                        </div>
                        <span className="text-xs text-blue-300/40">#{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Objection History */}
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold text-white">Objection History</h2>
                  <p className="text-sm text-blue-200/70">
                    {session.objection_history.length} objection(s) raised
                  </p>
                </CardHeader>
                <CardContent>
                  {session.objection_history.length === 0 ? (
                    <p className="text-sm text-blue-100/50 py-4 text-center">
                      No objections were raised in this session.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {session.objection_history.map((obj, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5"
                        >
                          <span className="text-rose-400 text-lg shrink-0">⚠</span>
                          <div>
                            <p className="text-sm text-white font-medium">"{obj}"</p>
                            <p className="text-xs text-rose-200/50 mt-0.5">Objection #{i + 1}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Transcript */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-white">Full Transcript</h2>
                <p className="text-sm text-blue-200/70">
                  {session.conversation_messages.length} message(s)
                </p>
              </CardHeader>
              <CardContent>
                {session.conversation_messages.length === 0 ? (
                  <p className="text-sm text-blue-100/50 py-4 text-center">
                    No messages found. Session may be using local (non-persisted) mode.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {session.conversation_messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-2.5",
                          msg.role === "trainee"
                            ? "ml-auto bg-blue-600 text-white"
                            : "bg-slate-800 text-blue-100"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                            {msg.role === "trainee" ? "Agent" : "Client"}
                          </p>
                          {msg.stage_at_time && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-white/10 text-white/40 border-0">
                              {STAGE_META[msg.stage_at_time].label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p className="text-[10px] text-white/30 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
