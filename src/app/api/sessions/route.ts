import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { RoleplayStage } from "@/types/domain";

export interface CreateSessionPayload {
  userId: string;
  scenarioId: string;
  personaId: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  currentStage: RoleplayStage;
  stageHistory: RoleplayStage[];
  objectionHistory: string[];
  trustLevel: number;
  stageRepeatCount: number;
  persisted: boolean;
}

/** POST /api/sessions — create a new training session */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateSessionPayload;

    if (!body.scenarioId || !body.personaId) {
      return NextResponse.json({ error: "scenarioId and personaId are required" }, { status: 400 });
    }

    const userId = body.userId || "anonymous";
    const initialStage: RoleplayStage = "opening";

    const supabase = await getSupabaseClient();

    if (!supabase) {
      // Supabase not configured — return an in-memory session ID
      const sessionId = `local-${crypto.randomUUID()}`;
      const result: CreateSessionResponse = {
        sessionId,
        currentStage: initialStage,
        stageHistory: [initialStage],
        objectionHistory: [],
        trustLevel: 30,
        stageRepeatCount: 0,
        persisted: false,
      };
      return NextResponse.json(result);
    }

    // Ensure user row exists (upsert anonymous users)
    await supabase
      .from("users")
      .upsert(
        { id: userId === "anonymous" ? undefined : userId, email: `${userId}@local`, full_name: "Anonymous Trainee", role: "trainee" },
        { onConflict: "email", ignoreDuplicates: true }
      );

    // Fetch the real user id if userId was anonymous
    let resolvedUserId = userId;
    if (userId === "anonymous") {
      const { data: anonUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", "anonymous@local")
        .single();
      resolvedUserId = anonUser?.id ?? crypto.randomUUID();
    }

    const { data, error } = await supabase
      .from("training_sessions")
      .insert({
        user_id: resolvedUserId,
        scenario_id: body.scenarioId,
        persona_id: body.personaId,
        status: "active",
        current_stage: initialStage,
        stage_history: [initialStage],
        objection_history: [],
        trust_level: 30,
        stage_repeat_count: 0,
        debug_state: {},
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create session in DB", error);
      const sessionId = `local-${crypto.randomUUID()}`;
      return NextResponse.json({
        sessionId,
        currentStage: initialStage,
        stageHistory: [initialStage],
        objectionHistory: [],
        trustLevel: 30,
        stageRepeatCount: 0,
        persisted: false,
      } satisfies CreateSessionResponse);
    }

    return NextResponse.json({
      sessionId: data.id,
      currentStage: initialStage,
      stageHistory: [initialStage],
      objectionHistory: [],
      trustLevel: 30,
      stageRepeatCount: 0,
      persisted: true,
    } satisfies CreateSessionResponse);
  } catch (error) {
    console.error("POST /api/sessions error", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
