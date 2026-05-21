import { NextResponse } from "next/server";
import { RealtimeSessionConfig } from "@/types/domain";
import { buildRealtimeSystemPrompt } from "@/lib/realtime/session-orchestrator";
import fs from "fs";
import path from "path";

const contextFilePath = path.join(process.cwd(), "src/lib/custom-context.json");

// Helper to read the context safely
function readContextSafely(): any | null {
  try {
    if (fs.existsSync(contextFilePath)) {
      const data = fs.readFileSync(contextFilePath, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading custom context in realtime session route:", error);
  }
  return null;
}

// Generate the opening greeting based on custom context, scenario, and language
function getOpeningGreeting(
  type: string,
  lang: string = "en",
  personaName: string = "Tsing Lu"
): string {
  if (lang === "id") {
    if (type === "appointment_setting") {
      return `${personaName} di sini. Saya hanya punya beberapa menit — ini ada keperluan apa?`;
    }
    if (type === "fact_finding") {
      return "Halo. Saya bisa bicara sebentar, tapi mohon langsung ke intinya. Ada keperluan apa?";
    }
    return "Halo. Saya akan mendengarkan, tapi tolong yang relevan — saya tidak tertarik dengan penawaran yang terlalu umum.";
  }
  if (type === "appointment_setting") {
    return `${personaName} here. I only have a few minutes — what is this call about?`;
  }
  if (type === "fact_finding") {
    return "Hello. I have a moment to talk, but I prefer practical, direct conversations. What is this about?";
  }
  return "Hello. I'll listen, but please keep it relevant — I'm not interested in a generic pitch.";
}

/**
 * POST /api/realtime/session
 *
 * Creates an OpenAI Realtime ephemeral token for the client to use
 * in a WebRTC session.
 */
export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  try {
    const config = (await request.json()) as RealtimeSessionConfig;
    const customContext = readContextSafely();
    const activePersonaName = customContext?.persona?.name ?? "Tsing Lu";
    const openingGreeting = getOpeningGreeting(config.scenarioType, config.lang, activePersonaName);

    // ── No API key → return mock mode signal ──────────────
    if (!apiKey) {
      return NextResponse.json({
        sessionId: `mock-${Date.now()}`,
        ephemeralToken: null,
        expiresAt: null,
        mode: "mock",
        systemPrompt: buildRealtimeSystemPrompt(config, customContext),
        openingGreeting,
        customContext,
      });
    }

    // ── Live OpenAI Realtime session (GA API) ─────────────
    const systemPrompt = buildRealtimeSystemPrompt(config, customContext);

    const sessionRes = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime-2",
          instructions: systemPrompt,
          audio: {
            output: {
              voice: "alloy",
            },
            input: {
              transcription: {
                model: "gpt-4o-transcribe",
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 800,
                interrupt_response: false,
              },
            },
          },
          max_output_tokens: 1024,
        },
      }),
    });

    // ── Log raw OpenAI response for debugging ─────────────
    const rawText = await sessionRes.text();
    console.log("[realtime/session] OpenAI status:", sessionRes.status);
    console.log("[realtime/session] OpenAI raw response:", rawText);

    if (!sessionRes.ok) {
      console.error("OpenAI realtime/client_secrets error:", sessionRes.status, rawText);
      return NextResponse.json({
        sessionId: `mock-${Date.now()}`,
        ephemeralToken: null,
        expiresAt: null,
        mode: "mock",
        systemPrompt,
        openingGreeting,
        customContext,
        warning: `OpenAI API returned ${sessionRes.status} — running in mock mode. Details: ${rawText}`,
      });
    }

    // GA response: { value: "ek_...", expires_at: number, session: { id: string, ... } }
    let data: { value: string; expires_at: number; session: { id: string; model?: string } };
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("[realtime/session] Failed to parse OpenAI response as JSON:", rawText);
      return NextResponse.json({ error: "Invalid JSON from OpenAI" }, { status: 502 });
    }
    console.log("[realtime/session] Parsed session id:", data.session?.id, "token prefix:", data.value?.slice(0, 10));

    if (!data.session?.id || !data.value) {
      console.error("[realtime/session] Unexpected response shape:", data);
      return NextResponse.json({ error: "Invalid response shape from OpenAI" }, { status: 502 });
    }

    return NextResponse.json({
      sessionId: data.session.id,
      ephemeralToken: data.value,          // ek_... short-lived token for WebRTC SDP auth
      expiresAt: data.expires_at,
      model: data.session.model ?? "gpt-realtime-2",  // echo model for client SDP URL
      mode: "live",
      openingGreeting,
      customContext,
    });
  } catch (err) {
    console.error("realtime/session error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
