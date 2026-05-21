import { NextResponse } from "next/server";

/**
 * GET /api/admin/config-status
 * Returns which environment integrations are currently active.
 * Used by the admin page to show setup status.
 */
export async function GET() {
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const hasOpenAi = Boolean(openAiKey && openAiKey.length > 10);
  const hasSupabase = Boolean(supabaseUrl);

  // Quick validation: test if OpenAI key format is valid (starts with sk-)
  const openAiKeyValid = hasOpenAi && (openAiKey!.startsWith("sk-") || openAiKey!.startsWith("sk-proj-"));

  return NextResponse.json({
    openai: {
      configured: hasOpenAi,
      valid: openAiKeyValid,
      mode: hasOpenAi && openAiKeyValid ? "live" : "mock",
      label: hasOpenAi && openAiKeyValid
        ? "✅ OpenAI Connected — Chat AI + Scoring aktif"
        : "⚠️ OpenAI tidak dikonfigurasi — berjalan dalam Mock Mode",
    },
    supabase: {
      configured: hasSupabase,
      label: hasSupabase
        ? "✅ Supabase Connected — Session persistence aktif"
        : "⚠️ Supabase tidak dikonfigurasi — menggunakan in-memory mode",
    },
    realtimeVoice: {
      available: hasOpenAi && openAiKeyValid,
      label: hasOpenAi && openAiKeyValid
        ? "✅ Realtime Voice siap — WebRTC + OpenAI Realtime API aktif"
        : "⚠️ Realtime Voice tidak aktif — butuh OPENAI_API_KEY",
    },
  });
}
