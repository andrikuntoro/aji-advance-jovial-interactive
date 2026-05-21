import { NextRequest, NextResponse } from "next/server";
import { generateMockRoleplayReply, buildSystemPrompt, computeNextStage, computeTrustLevel, detectObjection, detectPositiveSignal, STAGE_META } from "@/lib/scenario-engine";
import { DEFAULT_PERSONA, MVP_SCENARIOS } from "@/lib/mock-data";
import { RoleplayRespondRequest, RoleplayRespondResponse, RoleplayStage } from "@/types/domain";
import fs from "fs";
import path from "path";

const contextFilePath = path.join(process.cwd(), "src/lib/custom-context.json");

function readContextSafely(): any | null {
  try {
    if (fs.existsSync(contextFilePath)) {
      const data = fs.readFileSync(contextFilePath, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading custom context in respond route:", error);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RoleplayRespondRequest;
    const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
    const customContext = readContextSafely();

    if (
      !body.sessionId ||
      !body.scenarioId ||
      !body.personaId ||
      !body.traineeMessage ||
      !body.currentStage ||
      !Array.isArray(body.stageHistory) ||
      !Array.isArray(body.objectionHistory)
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // ── Mock mode ──────────────────────────────────────────────
    if (!hasApiKey) {
      const mock = generateMockRoleplayReply(body);
      return NextResponse.json(mock);
    }

    // ── OpenAI mode ────────────────────────────────────────────
    const scenario = MVP_SCENARIOS.find((s) => s.id === body.scenarioId) ?? MVP_SCENARIOS[0];
    const persona = DEFAULT_PERSONA; // Future: look up by body.personaId

    // Pre-compute deterministic next stage as a baseline
    const objectionDetected = detectObjection(body.traineeMessage);
    const positiveSignal = detectPositiveSignal(body.traineeMessage);
    const baseTrust = Math.min(28 + body.conversation.length * 2, 85);
    const trustLevel = computeTrustLevel(baseTrust, 0, positiveSignal, !!objectionDetected);

    const stageRepeatCount = (() => {
      let count = 0;
      for (let i = body.stageHistory.length - 1; i >= 0; i--) {
        if (body.stageHistory[i] === body.currentStage) count++;
        else break;
      }
      return count;
    })();

    const deterministicNextStage = computeNextStage({
      currentStage: body.currentStage,
      stageRepeatCount,
      trustLevel,
      objectionDetected: !!objectionDetected,
      positiveSignal,
    });

    const systemPrompt = buildSystemPrompt(
      scenario,
      persona,
      body.currentStage,
      deterministicNextStage,
      body.objectionHistory,
      trustLevel,
      body.lang ?? "en",
      customContext || undefined
    );

    // Build conversation history for OpenAI
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...body.conversation
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: (m.role === "trainee" ? "user" : "assistant") as "user" | "assistant",
          content: m.content,
        })),
    ];

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 200,
        temperature: 0.75,
      }),
    });

    if (!openaiRes.ok) {
      console.error("OpenAI error", openaiRes.status, await openaiRes.text());
      // Fallback to mock on OpenAI failure
      const mock = generateMockRoleplayReply(body);
      return NextResponse.json({ ...mock, mode: "mock" });
    }

    const openaiData = await openaiRes.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    let reply = openaiData.choices?.[0]?.message?.content?.trim() ?? "";

    // Extract optional stage advance tag emitted by the model: [STAGE:stage_name]
    let modelSignaledStage: RoleplayStage | null = null;
    const stageTagMatch = reply.match(/\[STAGE:([a-z_]+)\]$/);
    if (stageTagMatch) {
      const candidate = stageTagMatch[1] as RoleplayStage;
      if (STAGE_META[candidate]) {
        modelSignaledStage = candidate;
      }
      reply = reply.replace(/\[STAGE:[a-z_]+\]$/, "").trim();
    }

    const nextStage: RoleplayStage = modelSignaledStage ?? deterministicNextStage;

    const updatedStageHistory =
      body.stageHistory[body.stageHistory.length - 1] === nextStage
        ? body.stageHistory
        : [...body.stageHistory, nextStage];

    const updatedObjectionHistory = objectionDetected
      ? [...body.objectionHistory, objectionDetected]
      : body.objectionHistory;

    const result: RoleplayRespondResponse = {
      reply,
      objectionRaised: objectionDetected,
      trustLevel,
      currentStage: body.currentStage,
      nextStage,
      stageHistory: updatedStageHistory,
      objectionHistory: updatedObjectionHistory,
      mode: "openai",
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("roleplay/respond error", error);
    return NextResponse.json({ error: "Failed to generate roleplay response" }, { status: 500 });
  }
}
