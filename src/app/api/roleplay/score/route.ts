import { NextRequest, NextResponse } from "next/server";
import { generateMockScore } from "@/lib/scenario-engine";
import { RoleplayScoreRequest, RoleplayScoreResponse } from "@/types/domain";
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
    console.error("Error reading custom context in score route:", error);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RoleplayScoreRequest & { lang?: string };
    const hasApiKey = Boolean(process.env.OPENAI_API_KEY?.trim());
    const lang = body.lang ?? "en";
    const isId = lang === "id";
    const customContext = readContextSafely();

    if (!body.sessionId || !body.scenarioId || !body.personaId || !body.transcript?.length) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // ── Guard: no real trainee messages → return all-zero score immediately ──
    const realTraineeMessages = body.transcript.filter(
      (m) => m.role === "trainee" && m.content.trim() !== "" && m.content !== "(no messages)"
    );
    if (realTraineeMessages.length === 0) {
      const zeroCats = [
        { key: "communication_clarity",  label: isId ? "Kejelasan Komunikasi"  : "Communication Clarity",  score: 0, feedback: isId ? "Tidak ada percakapan dari agen dalam sesi ini." : "No agent conversation in this session." },
        { key: "rapport_building",       label: isId ? "Membangun Hubungan"    : "Building Rapport",        score: 0, feedback: isId ? "Tidak ada percakapan dari agen dalam sesi ini." : "No agent conversation in this session." },
        { key: "empathy",                label: isId ? "Empati"                : "Empathy",                 score: 0, feedback: isId ? "Tidak ada percakapan dari agen dalam sesi ini." : "No agent conversation in this session." },
        { key: "needs_discovery",        label: isId ? "Penemuan Kebutuhan"    : "Needs Discovery",         score: 0, feedback: isId ? "Tidak ada percakapan dari agen dalam sesi ini." : "No agent conversation in this session." },
        { key: "objection_handling",     label: isId ? "Penanganan Keberatan"  : "Objection Handling",      score: 0, feedback: isId ? "Tidak ada percakapan dari agen dalam sesi ini." : "No agent conversation in this session." },
        { key: "product_explanation",    label: isId ? "Penjelasan Produk"     : "Product Explanation",     score: 0, feedback: isId ? "Tidak ada percakapan dari agen dalam sesi ini." : "No agent conversation in this session." },
        { key: "closing_ability",        label: isId ? "Kemampuan Menutup"     : "Closing Ability",         score: 0, feedback: isId ? "Tidak ada percakapan dari agen dalam sesi ini." : "No agent conversation in this session." },
        { key: "compliance_awareness",   label: isId ? "Kesadaran Kepatuhan"   : "Compliance Awareness",    score: 0, feedback: isId ? "Tidak ada percakapan dari agen dalam sesi ini." : "No agent conversation in this session." },
      ];
      const zeroReport: RoleplayScoreResponse = {
        report: {
          sessionId: body.sessionId,
          scenarioId: body.scenarioId,
          personaId: body.personaId,
          overallScore: 0,
          categories: zeroCats as RoleplayScoreResponse["report"]["categories"],
          strengths: [],
          improvementAreas: [
            isId
              ? "Mulai percakapan segera setelah sesi dimulai — balas sapaan AI untuk membuka sesi."
              : "Start the conversation immediately after the session begins — respond to the AI greeting.",
          ],
          suggestedBetterResponse: isId
            ? `"Selamat siang, Pak ${customContext?.persona?.name ?? "Tsing"}! Saya [nama] dari [perusahaan]. Apakah Bapak punya 5 menit?"`
            : `"Good afternoon, Mr. ${customContext?.persona?.name ?? "Tsing"}! I'm [name] from [company]. Do you have 5 minutes?"`,
          nextRecommendedPractice: isId
            ? "Coba lagi dan buka percakapan dengan sapaan dan perkenalan diri dalam 30 detik pertama."
            : "Try again and open with a greeting and self-introduction within the first 30 seconds.",
        },
        mode: "mock",
      };
      return NextResponse.json(zeroReport);
    }

    if (!hasApiKey) {
      const mock = generateMockScore({ ...body, lang } as RoleplayScoreRequest & { lang: string });
      return NextResponse.json(mock);
    }

    // ── OpenAI scoring ──────────────────────────────────────
    const activePersonaName = customContext?.persona?.name ?? "Tsing Lu";
    const activePersonaAge = customContext?.persona?.age ?? 50;
    const activePersonaOccupation = customContext?.persona?.occupation ?? "Manufacturing business owner";
    const activeScenarioTitle = customContext?.scenario?.title ?? body.scenarioId.replace("scenario-", "").replace(/-/g, " ");

    let frameworkScoringInstructions = "";
    if (customContext?.objectionFramework) {
      const f = customContext.objectionFramework;
      if (f.active === "3f") {
        frameworkScoringInstructions = isId
          ? `Sesi ini dinilai menggunakan framework 3F (Feel, Felt, Found) untuk penanganan keberatan:
1. Feel: Apakah agen berempati dan memvalidasi kekhawatiran nasabah? (Panduan: ${f.feelText})
2. Felt: Apakah agen menunjukkan kesamaan dengan nasabah lain? (Panduan: ${f.feltText})
3. Found: Apakah agen menawarkan benefit/sudut pandang baru yang menarik? (Panduan: ${f.foundText})
Berikan bobot nilai tinggi pada kategori objection_handling dan empathy jika agen menggunakan framework 3F ini secara bertahap dan natural.`
          : `This session is graded using the 3F (Feel, Felt, Found) framework for objection handling:
1. Feel: Did the agent empathize and validate the client's concern? (Guideline: ${f.feelText})
2. Felt: Did the agent show validation via other clients? (Guideline: ${f.feltText})
3. Found: Did the agent offer a benefit/reframing? (Guideline: ${f.foundText})
Give high scores in objection_handling and empathy if the agent naturally employs the 3F framework.`;
      } else {
        frameworkScoringInstructions = isId
          ? `Sesi ini dinilai menggunakan framework 4C (Capture, Context, Conflict, Closure) untuk penanganan keberatan dan alur panggilan:
1. Capture: Apakah agen memicu perhatian dengan tren industri/topik hangat? (Panduan: ${f.captureText})
2. Context: Apakah agen membangun rapport dengan relevansi? (Panduan: ${f.contextText})
3. Conflict: Apakah agen menyoroti risiko finansial yang mendesak? (Panduan: ${f.conflictText})
4. Closure: Apakah agen mengamankan janji temu dengan solusi jelas? (Panduan: ${f.closureText})
Berikan bobot nilai tinggi pada kategori objection_handling dan closing_ability jika agen mengikuti alur 4C ini.`
          : `This session is graded using the 4C (Capture, Context, Conflict, Closure) framework for objection handling and call flow:
1. Capture: Did the agent hook attention using industry trends? (Guideline: ${f.captureText})
2. Context: Did they set appropriate context/rapport? (Guideline: ${f.contextText})
3. Conflict: Did they introduce urgency/risk? (Guideline: ${f.conflictText})
4. Closure: Did they propose a clear follow-up action/meeting? (Guideline: ${f.closureText})
Give high scores in objection_handling and closing_ability if the agent follows the 4C structure.`;
      }
    }

    const transcriptText = body.transcript
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role === "trainee" ? (isId ? "Agen" : "Agent") : (isId ? "Klien" : "Client")}: ${m.content}`)
      .join("\n");

    const scoringPrompt = isId
      ? `Anda adalah evaluator ahli pelatihan penjualan asuransi.

Evaluasi transkrip roleplay berikut antara agen asuransi (trainee) dengan prospek (${activePersonaName}, ${activePersonaOccupation}, ${activePersonaAge} tahun, skeptis namun terbuka).
Skenario: ${activeScenarioTitle}.

Beri skor setiap kategori dari 0–100 berdasarkan percakapan NYATA ini (bukan secara umum):
- communication_clarity: Seberapa jelas dan terstruktur komunikasi agen?
- rapport_building: Seberapa baik agen membangun kepercayaan dan kedekatan?
- empathy: Apakah agen menunjukkan empati yang tulus?
- needs_discovery: Seberapa efektif agen menggali kebutuhan klien?
- objection_handling: Seberapa baik agen menangani keberatan klien?
- product_explanation: Seberapa jelas solusi yang relevan dijelaskan?
- closing_ability: Seberapa baik agen bergerak menuju komitmen atau langkah berikutnya?
- compliance_awareness: Apakah agen berperilaku profesional dan etis?

${frameworkScoringInstructions}

Juga sediakan (dalam Bahasa Indonesia):
- strengths: 2 kekuatan spesifik berdasarkan transkrip ini (bukan generik)
- improvementAreas: 2 area perbaikan spesifik berdasarkan apa yang sebenarnya terjadi
- suggestedBetterResponse: Satu contoh respons yang lebih baik untuk momen terlemah dalam percakapan
- nextRecommendedPractice: Satu rekomendasi latihan spesifik berdasarkan skenario dan kelemahan ini

Respond with JSON only:
{
  "categories": [{"key": "...", "label": "...", "score": 0, "feedback": "... (dalam Bahasa Indonesia)"}],
  "overallScore": 0,
  "strengths": ["... (dalam Bahasa Indonesia)", "..."],
  "improvementAreas": ["... (dalam Bahasa Indonesia)", "..."],
  "suggestedBetterResponse": "... (dalam Bahasa Indonesia)",
  "nextRecommendedPractice": "... (dalam Bahasa Indonesia)"
}

TRANSKRIP:
${transcriptText}`
      : `You are an expert insurance sales training evaluator.

Evaluate the following roleplay transcript between an insurance agent (trainee) and a client persona (${activePersonaName}, ${activePersonaOccupation}, age ${activePersonaAge}, analytical and initially skeptical).
Scenario: ${activeScenarioTitle}.

Score each of these 8 categories from 0–100 based on THIS SPECIFIC conversation (not generically):
- communication_clarity: How clear and structured was the agent's communication?
- rapport_building: How well did the agent build trust and connection?
- empathy: Did the agent demonstrate genuine empathy and understanding?
- needs_discovery: How effectively did the agent uncover the client's needs?
- objection_handling: How well did the agent address client objections?
- product_explanation: How clearly were relevant solutions explained?
- closing_ability: How well did the agent move toward commitment or next steps?
- compliance_awareness: Did the agent behave professionally and ethically?

${frameworkScoringInstructions}

Also provide:
- strengths: 2 specific strengths observed in THIS transcript (not generic praise)
- improvementAreas: 2 specific improvements based on what actually happened
- suggestedBetterResponse: One example of a better response for the weakest moment in the conversation
- nextRecommendedPractice: One specific recommended practice based on this scenario and these weaknesses

Respond with JSON only:
{
  "categories": [{"key": "...", "label": "...", "score": 0, "feedback": "..."}],
  "overallScore": 0,
  "strengths": ["...", "..."],
  "improvementAreas": ["...", "..."],
  "suggestedBetterResponse": "...",
  "nextRecommendedPractice": "..."
}

TRANSCRIPT:
${transcriptText}`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: scoringPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!openaiRes.ok) {
      console.error("OpenAI scoring error", openaiRes.status);
      const mock = generateMockScore(body);
      return NextResponse.json({ ...mock, mode: "mock" });
    }

    const openaiData = await openaiRes.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const parsed = JSON.parse(openaiData.choices?.[0]?.message?.content ?? "{}");

    const result: RoleplayScoreResponse = {
      report: {
        sessionId: body.sessionId,
        overallScore: parsed.overallScore ?? 70,
        categories: parsed.categories ?? [],
        strengths: parsed.strengths ?? [],
        improvementAreas: parsed.improvementAreas ?? [],
        suggestedBetterResponse: parsed.suggestedBetterResponse ?? "",
        nextRecommendedPractice: parsed.nextRecommendedPractice ?? "",
        personaId: body.personaId,
        scenarioId: body.scenarioId,
      },
      mode: "openai",
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("roleplay/score error", error);
    return NextResponse.json({ error: "Failed to generate score report" }, { status: 500 });
  }
}
