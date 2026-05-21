import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { RoleplayStage } from "@/types/domain";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export interface SessionPatchPayload {
  currentStage: RoleplayStage;
  nextStage: RoleplayStage;
  stageHistory: RoleplayStage[];
  objectionHistory: string[];
  trustLevel: number;
  stageRepeatCount: number;
  status?: "active" | "completed";
  debugState?: Record<string, unknown>;
  /** Stage at the time of this message — stored on conversation_messages */
  messageStage?: RoleplayStage;
}

/** GET /api/sessions/[id] — read session state */
export async function GET(_: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const supabase = await getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("training_sessions")
    .select(`
      id,
      scenario_id,
      persona_id,
      started_at,
      ended_at,
      status,
      current_stage,
      stage_history,
      objection_history,
      trust_level,
      stage_repeat_count,
      debug_state,
      conversation_messages (
        id, role, content, stage_at_time, created_at
      )
    `)
    .eq("id", id)
    .order("created_at", { referencedTable: "conversation_messages", ascending: true })
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

/** PATCH /api/sessions/[id] — update stage state after each AI turn */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const supabase = await getSupabaseClient();
  if (!supabase) {
    // No DB — silently succeed (state is managed client-side)
    return NextResponse.json({ ok: true, persisted: false });
  }

  try {
    const body = (await request.json()) as SessionPatchPayload;

    const isCompleted = body.nextStage === "completed" || body.status === "completed";

    const { error } = await supabase
      .from("training_sessions")
      .update({
        current_stage: body.nextStage ?? body.currentStage,
        stage_history: body.stageHistory,
        objection_history: body.objectionHistory,
        trust_level: body.trustLevel,
        stage_repeat_count: body.stageRepeatCount,
        status: isCompleted ? "completed" : "active",
        ended_at: isCompleted ? new Date().toISOString() : null,
        debug_state: body.debugState ?? {},
      })
      .eq("id", id);

    if (error) {
      console.error("PATCH /api/sessions/[id] error", error);
      return NextResponse.json({ ok: true, persisted: false });
    }

    return NextResponse.json({ ok: true, persisted: true });
  } catch (error) {
    console.error("PATCH /api/sessions/[id] unexpected error", error);
    return NextResponse.json({ ok: true, persisted: false });
  }
}
