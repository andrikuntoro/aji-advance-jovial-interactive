/**
 * AJI Scenario Engine — State Machine & System Prompt Builder
 *
 * This module is the single source of truth for:
 *  1. Stage transition logic (computeNextStage)
 *  2. Stage metadata and labels (STAGE_META)
 *  3. OpenAI system prompt assembly (buildSystemPrompt)
 *  4. Enhanced mock reply generation (generateMockRoleplayReply)
 *
 * All functions are pure — no side effects, no DB calls.
 */

import { DEFAULT_PERSONA, MVP_SCENARIOS, SCORE_CATEGORY_TEXT } from "@/lib/mock-data";
import { clamp } from "@/lib/utils";
import {
  Persona,
  RoleplayRespondRequest,
  RoleplayRespondResponse,
  RoleplayScoreRequest,
  RoleplayScoreResponse,
  RoleplayStage,
  ScoreCategory,
  Scenario,
} from "@/types/domain";

// ─────────────────────────────────────────────────────────
// Stage Metadata
// ─────────────────────────────────────────────────────────

export interface StageMeta {
  label: string;
  description: string;
  /** 0-based position in the canonical order */
  order: number;
  /** Maximum turns the engine will allow before force-advancing */
  maxRepeats: number;
}

export const STAGE_ORDER: RoleplayStage[] = [
  "opening",
  "permission_to_continue",
  "needs_exploration",
  "objection_triggered",
  "value_reframe",
  "appointment_or_next_step",
  "closing",
  "completed",
];

export const STAGE_META: Record<RoleplayStage, StageMeta> = {
  opening: {
    label: "Opening",
    description: "Trainee introduces themselves and establishes initial contact.",
    order: 0,
    maxRepeats: 2,
  },
  permission_to_continue: {
    label: "Permission to Continue",
    description: "Trainee earns the client's permission to continue the conversation.",
    order: 1,
    maxRepeats: 3,
  },
  needs_exploration: {
    label: "Needs Exploration",
    description: "Trainee uncovers client goals, concerns, and financial priorities.",
    order: 2,
    maxRepeats: 4,
  },
  objection_triggered: {
    label: "Objection Triggered",
    description: "Client raised an objection that must be addressed before advancing.",
    order: 3,
    maxRepeats: 3,
  },
  value_reframe: {
    label: "Value Reframe",
    description: "Trainee reframes value to overcome skepticism and rebuild trust.",
    order: 4,
    maxRepeats: 3,
  },
  appointment_or_next_step: {
    label: "Appointment / Next Step",
    description: "Trainee proposes a concrete next action or meeting.",
    order: 5,
    maxRepeats: 2,
  },
  closing: {
    label: "Closing",
    description: "Trainee secures commitment or agreement from the client.",
    order: 6,
    maxRepeats: 2,
  },
  completed: {
    label: "Completed",
    description: "Session has concluded.",
    order: 7,
    maxRepeats: 999,
  },
};

// ─────────────────────────────────────────────────────────
// Signal Detection
// ─────────────────────────────────────────────────────────

const OBJECTION_PATTERNS = [
  // English
  "busy", "already have insurance", "send me information", "send me the",
  "not interested", "expensive", "too much", "no time", "later",
  "think about it", "need to discuss", "talk to my spouse",
  "talk to my wife", "talk to my husband", "not now", "don't need", "don't want",
  // Indonesian
  "sibuk", "sudah punya asuransi", "kirim informasi", "kirim dulu",
  "tidak tertarik", "mahal", "terlalu banyak", "tidak ada waktu", "nanti saja",
  "pikir-pikir dulu", "perlu diskusi", "tanya istri", "tanya suami",
  "tidak sekarang", "tidak perlu", "tidak mau", "tidak butuh",
];

const POSITIVE_PATTERNS = [
  // English
  "understand", "help", "plan", "family", "goal", "protect", "thanks",
  "appreciate", "sounds good", "okay", "sure", "let's", "tell me more",
  "interested", "education", "medical", "agree", "proceed", "schedule", "meeting",
  // Indonesian
  "mengerti", "bantu", "rencana", "keluarga", "tujuan", "lindungi", "terima kasih",
  "menghargai", "kedengarannya baik", "oke", "baik", "ceritakan lebih",
  "tertarik", "pendidikan", "kesehatan", "setuju", "lanjutkan", "jadwalkan", "pertemuan",
];

export function detectObjection(text: string): string | null {
  const lower = text.toLowerCase();
  return OBJECTION_PATTERNS.find((p) => lower.includes(p)) ?? null;
}

export function detectPositiveSignal(text: string): boolean {
  const lower = text.toLowerCase();
  return POSITIVE_PATTERNS.some((p) => lower.includes(p));
}

// ─────────────────────────────────────────────────────────
// State Machine: computeNextStage
// ─────────────────────────────────────────────────────────

export interface StageComputeInput {
  currentStage: RoleplayStage;
  stageRepeatCount: number;
  trustLevel: number;
  objectionDetected: boolean;
  positiveSignal: boolean;
}

export function computeNextStage(input: StageComputeInput): RoleplayStage {
  const { currentStage, stageRepeatCount, trustLevel, objectionDetected, positiveSignal } = input;
  const meta = STAGE_META[currentStage];
  const forceAdvance = stageRepeatCount >= meta.maxRepeats;

  if (currentStage === "completed") return "completed";

  if (currentStage === "opening") {
    // Opening always advances after first trainee turn
    return "permission_to_continue";
  }

  if (currentStage === "permission_to_continue") {
    if (objectionDetected) return "objection_triggered";
    if (positiveSignal || forceAdvance) return "needs_exploration";
    return "permission_to_continue";
  }

  if (currentStage === "needs_exploration") {
    if (objectionDetected) return "objection_triggered";
    if (trustLevel >= 60 || forceAdvance) return "appointment_or_next_step";
    return "needs_exploration";
  }

  if (currentStage === "objection_triggered") {
    if (positiveSignal) return "value_reframe";
    if (forceAdvance) return "needs_exploration"; // don't let it loop forever
    return "objection_triggered";
  }

  if (currentStage === "value_reframe") {
    if (objectionDetected) return "objection_triggered";
    if (trustLevel >= 60 || forceAdvance) return "appointment_or_next_step";
    return "needs_exploration";
  }

  if (currentStage === "appointment_or_next_step") {
    if (trustLevel >= 68 || forceAdvance) return "closing";
    return "value_reframe";
  }

  if (currentStage === "closing") {
    return "completed";
  }

  return "completed";
}

// ─────────────────────────────────────────────────────────
// Trust Level Computation
// ─────────────────────────────────────────────────────────

export function computeTrustLevel(
  baseLevel: number,
  turnCount: number,
  positiveSignal: boolean,
  objectionDetected: boolean
): number {
  const base = clamp(baseLevel + turnCount * 2, 10, 90);
  const shift = (positiveSignal ? 8 : -3) + (objectionDetected ? -5 : 3);
  return clamp(base + shift, 5, 95);
}

// ─────────────────────────────────────────────────────────
// System Prompt Builder
// ─────────────────────────────────────────────────────────

export function buildSystemPrompt(
  scenario: Scenario,
  persona: Persona,
  currentStage: RoleplayStage,
  nextStage: RoleplayStage,
  objectionHistory: string[],
  trustLevel: number,
  lang: "en" | "id" = "en",
  customContext?: any
): string {
  const isId = lang === "id";

  const activePersonaName = customContext?.persona?.name ?? persona.name;
  const activePersonaOccupation = customContext?.persona?.occupation ?? persona.occupation;
  const activePersonaAge = customContext?.persona?.age ?? persona.age;

  const langInstruction = isId
    ? `\n\n## BAHASA & GAYA BICARA\nSeluruh respons HARUS dalam Bahasa Indonesia yang natural dan conversational — bukan formal atau kaku. Gunakan gaya bicara orang bisnis Indonesia yang efisien: langsung, sedikit tidak sabar, tapi sopan. Boleh menggunakan kata-kata seperti "oke", "hmm", "ya", "jadi", "tapi", "terus terang". JANGAN bicara seperti buku teks.`
    : "";

  let personalityRules = "";
  if (customContext) {
    const cp = customContext.persona;
    personalityRules = isId
      ? `
## KEPRIBADIAN ${activePersonaName.toUpperCase()} (PENTING)
- **Sikap Dasar**: ${cp.personalityTraits}
- **Gaya Komunikasi**: ${cp.personalityCommunicationStyle}
- **Pendekatan Keputusan**: ${cp.personalityDecisionApproach}
- **Prioritas Keuangan**: ${cp.backgroundKeyPriorities} (Prioritas detail: ${cp.additionalGoals})
- **Skeptisisme**: Sangat hemat waktu. Anda melihat asuransi sebagai: ${cp.backgroundInsuranceKnowledge}.
- **Detail Latar Belakang**: ${cp.additionalStory}
- Kamu sibuk dan menghargai waktu — respons harus pendek (maksimal 2-3 kalimat), langsung, dan efisien.
- Kamu analytical: kamu suka data, angka konkret, perbandingan — bukan janji abstrak.
- Kamu tidak langsung percaya pada agen — kepercayaan harus dibangun perlahan.
- Kamu bisa sedikit sinis tapi tidak kasar — kamu seorang profesional.
- VARIASIKAN cara kamu mengekspresikan keraguan atau minat — JANGAN ulangi kalimat yang sama dua kali.`
      : `
## ${activePersonaName.toUpperCase()}'S PERSONALITY (IMPORTANT)
- **Core Traits**: ${cp.personalityTraits}
- **Communication Style**: ${cp.personalityCommunicationStyle}
- **Decision Approach**: ${cp.personalityDecisionApproach}
- **Key Priorities**: ${cp.backgroundKeyPriorities} (Priority breakdown: ${cp.additionalGoals})
- **Skepticism**: Highly time-conscious. You view insurance as: ${cp.backgroundInsuranceKnowledge}.
- **Background Context**: ${cp.additionalStory}
- You are busy and value your time — responses should be short (max 2-3 sentences), direct, efficient.
- You are analytical: you respond to data, concrete numbers, comparisons — not abstract promises.
- You don't trust agents easily — trust must be built incrementally.
- You can be slightly cynical but never rude — you're a professional.
- VARY how you express skepticism or interest — NEVER repeat the same phrase twice.`;
  } else {
    personalityRules = isId
      ? `
## KEPRIBADIAN TSING LU (PENTING)
- Kamu sibuk dan menghargai waktu — respons harus pendek, langsung, dan efisien
- Kamu analytical: kamu suka data, angka konkret, perbandingan — bukan janji abstrak
- Kamu tidak langsung percaya pada agen — kepercayaan harus dibangun perlahan
- Kamu bisa sedikit sinis tapi tidak kasar — kamu seorang profesional
- VARIASIKAN cara kamu mengekspresikan keraguan atau minat — JANGAN ulangi kalimat yang sama dua kali
- Reaksi kamu bergantung pada APA yang dikatakan agen: jika mereka menyebut keluarga/anak → kamu sedikit terbuka; jika mereka menyebut bisnis → kamu lebih engage; jika mereka terlalu generik → kamu langsung push back
- Sesekali kamu bisa memotong atau minta klarifikasi jika agen bicara terlalu panjang`
      : `
## TSING LU'S PERSONALITY (IMPORTANT)
- You are busy and value your time — responses should be short, direct, efficient
- You are analytical: you respond to data, concrete numbers, comparisons — not abstract promises
- You don't trust agents easily — trust must be built incrementally
- You can be slightly cynical but never rude — you're a professional
- VARY how you express skepticism or interest — NEVER repeat the same phrase twice
- Your reaction depends on WHAT the agent says: if they mention family/children → slightly more open; business risks → more engaged; too generic → immediate pushback
- Occasionally you can interrupt or ask for clarification if the agent is rambling`;
  }

  let frameworkInstruction = "";
  if (customContext?.objectionFramework) {
    const f = customContext.objectionFramework;
    if (f.active === "3f") {
      frameworkInstruction = isId
        ? `\n\n## METODE PENANGANAN KEBERATAN: 3F (Feel, Felt, Found)
Anda mengevaluasi apakah agen penasihat menggunakan metode 3F saat Anda menolak atau ragu:
1. **Feel**: Apakah mereka berempati dan memvalidasi kekhawatiran Anda? (Contoh: "${f.feelText || "Saya paham perasaan Bapak"}")
2. **Felt**: Apakah mereka menghubungkannya dengan orang lain yang juga merasakan hal serupa? (Contoh: "${f.feltText || "Banyak pengusaha lain juga merasa demikian"}")
3. **Found**: Apakah mereka memberikan sudut pandang baru yang menguntungkan Anda? (Contoh: "${f.foundText || "Tetapi mereka menemukan..."}")
Tanggapan Anda akan melembut jika mereka menggunakan langkah-langkah ini dengan tulus.`
        : `\n\n## OBJECTION HANDLING METHOD: 3F (Feel, Felt, Found)
You expect the agent to handle objections using the 3F framework:
1. **Feel**: Acknowledge/validate your concern. (e.g., "${f.feelText || "I understand how you feel"}")
2. **Felt**: Show others felt the same way. (e.g., "${f.feltText || "Other factory owners felt the same way"}")
3. **Found**: Reframe around benefit discovered. (e.g., "${f.foundText || "But they found..."}")
Soften your stance if they execute these steps genuinely.`;
    } else {
      frameworkInstruction = isId
        ? `\n\n## METODE PENANGANAN KEBERATAN: 4C (Capture, Context, Conflict, Closure)
Anda mengevaluasi apakah agen penasihat menggunakan metode 4C saat membangun hubungan dan menangani keberatan:
1. **Capture**: Menarik perhatian Anda dengan topik hangat/tren bisnis. (Contoh: "${f.captureText || "Menyoroti tren manufaktur"}")
2. **Context**: Membangun rapport dan skenario yang relevan dengan situasi Anda. (Contoh: "${f.contextText || "Membangun hubungan erat"}")
3. **Conflict**: Menyoroti risiko finansial yang mendesak bagi bisnis/keluarga Anda. (Contoh: "${f.conflictText || "Menunjukkan risiko jika terjadi hal tak di inginkan"}")
4. **Closure**: Mengajukan solusi jelas dan mengamankan janji temu berikutnya. (Contoh: "${f.closureText || "Mengusulkan solusi konkret"}")
Jawablah dengan lebih kooperatif jika mereka menunjukkan struktur 4C yang solid.`
        : `\n\n## OBJECTION HANDLING METHOD: 4C (Capture, Context, Conflict, Closure)
You expect the agent to guide the conversation using the 4C framework:
1. **Capture**: Capture attention with a trending topic. (e.g., "${f.captureText || "Trending industry topics"}")
2. **Context**: Establish context and frame the conversation. (e.g., "${f.contextText || "Establish relatability"}")
3. **Conflict**: Highlight financial risks or urgency. (e.g., "${f.conflictText || "Create sense of urgency"}")
4. **Closure**: Secure a follow-up action or next step. (e.g., "${f.closureText || "Propose clear next steps"}")
Be more collaborative if they display a solid 4C structure.`;
    }
  }

  const activeScenarioTitle = customContext?.scenario?.title ?? scenario.title;
  const activeScenarioObjective = customContext?.scenario?.objective ?? scenario.objective;

  const stageGuide = getStageGuide(scenario, nextStage, trustLevel);
  const objectionContext =
    objectionHistory.length > 0
      ? `\n\nObjections already raised: ${objectionHistory.map((o) => `"${o}"`).join(", ")}. ${isId ? "Jika keberatan ini belum ditangani dengan baik, kamu bisa singgung kembali." : "If these objections weren't properly addressed, you may reference them again."}`
      : "";

  const trustContext = isId
    ? trustLevel < 40
      ? "Kamu masih sangat skeptis. Kamu perlu jawaban konkret dan spesifik sebelum mau terlibat lebih jauh."
      : trustLevel < 65
      ? "Kamu mulai sedikit terbuka, tapi masih perlu melihat relevansi langsung dengan prioritasmu sebelum berbagi lebih."
      : "Kamu sudah cukup reseptif, tapi tetap butuh nilai yang jelas sebelum setuju apapun."
    : trustLevel < 40
    ? "You are quite skeptical and guarded. You require concrete, specific answers before engaging further."
    : trustLevel < 65
    ? "You are cautiously open, but need to see relevance to your priorities before sharing more."
    : "You are becoming more receptive and willing to engage, though you still need clear value demonstrated.";

  let profileBlock = "";
  if (customContext) {
    const cp = customContext.persona;
    profileBlock = isId
      ? `- **Nama**: ${cp.name}
- **Usia**: ${cp.age} tahun (${cp.gender})
- **Pekerjaan**: ${cp.occupation}
- **Demografi**: ${cp.demographics}
- **Lokasi**: ${cp.location}
- **Pendapatan Tahunan**: ${cp.annualIncome}
- **Riwayat Pekerjaan**: ${cp.backgroundWorkHistory}
- **Situasi Keuangan**: ${cp.backgroundFinancialSituation}
- **Kebutuhan Likuiditas**: ${cp.backgroundLiquidityNeeds}
- **Pengeluaran Gaya Hidup Utama**: ${cp.backgroundLifestyleExpenditures}
- **Hubungan Bank**: ${cp.backgroundExistingCustomer}
- **Pemahaman Asuransi**: ${cp.backgroundInsuranceKnowledge}
- **Skor Prioritas**: ${cp.backgroundKeyPriorities}`
      : `- **Name**: ${cp.name}
- **Age**: ${cp.age} years old (${cp.gender})
- **Occupation**: ${cp.occupation}
- **Demographics**: ${cp.demographics}
- **Location**: ${cp.location}
- **Annual Income**: ${cp.annualIncome}
- **Work History**: ${cp.backgroundWorkHistory}
- **Financial Situation**: ${cp.backgroundFinancialSituation}
- **Liquidity Needs**: ${cp.backgroundLiquidityNeeds}
- **Lifestyle Expenditures**: ${cp.backgroundLifestyleExpenditures}
- **Existing Relationship**: ${cp.backgroundExistingCustomer}
- **Insurance Knowledge**: ${cp.backgroundInsuranceKnowledge}
- **Key Focus**: ${cp.backgroundKeyPriorities}`;
  } else {
    profileBlock = persona.profile.map((p) => `- ${p}`).join("\n");
  }

  return `${isId ? "Kamu sedang berperan sebagai" : "You are roleplaying as"} ${activePersonaName}, ${isId ? `seorang ${activePersonaOccupation} berusia ${activePersonaAge} tahun` : `a ${activePersonaAge}-year-old ${activePersonaOccupation}`}.

## ${isId ? "Profil Kamu" : "Your Profile"}
${profileBlock}

${personalityRules}

## ${isId ? "Level Kepercayaan Saat Ini" : "Current Trust Level"}: ${trustLevel}/100
${trustContext}

## ${isId ? "Skenario Latihan" : "Training Scenario"}
${isId ? "Skenario" : "Scenario"}: ${activeScenarioTitle}
${isId ? "Tujuan agen trainee" : "Trainee agent objective"}: ${activeScenarioObjective}
${customContext?.scenario?.decisionLeadsSource ? `- ${isId ? "Sumber Prospek" : "Lead Source"}: ${customContext.scenario.decisionLeadsSource}` : ""}
${customContext?.scenario?.practiceObjectives ? `- ${isId ? "Target Latihan" : "Practice Objective"}: ${customContext.scenario.practiceObjectives}` : ""}
${frameworkInstruction}

## ${isId ? "Tahap Percakapan Saat Ini" : "Current Conversation Stage"}
${isId ? "Tahap" : "Stage"}: ${STAGE_META[nextStage].label} — ${STAGE_META[nextStage].description}
${objectionContext}

## ${isId ? "Panduan Respons untuk Tahap Ini" : "Response Instruction for This Stage"}
${stageGuide}${langInstruction}

## ${isId ? "Aturan Kritis" : "Critical Rules"}
- ${isId ? `Respons hanya sebagai ${activePersonaName}. JANGAN keluar dari karakter sama sekali.` : `Respond only as ${activePersonaName}. Never break character.`}
- ${isId ? "Maksimal 2-3 kalimat. Singkat dan natural — seperti orang sungguhan berbicara." : "Maximum 2-3 sentences. Short and natural — like a real person talking."}
- ${isId ? "JANGAN ungkapkan kriteria penilaian, nama tahap, atau mekanisme pelatihan." : "Do NOT reveal scoring criteria, stage names, or training mechanics."}
- ${isId ? "JANGAN mulai respons dengan kata yang sama berulang kali ('Hmm', 'Baik', dll)." : "Do NOT start responses with the same word repeatedly ('Hmm', 'Well', etc)."}
- ${isId ? `Jika kamu memutuskan agen berhasil melewati tahap ini, tambahkan tepat: [STAGE:${nextStage}] di akhir respons (tanpa spasi). Jika tidak, abaikan tag ini.` : `If you decide the trainee has earned a stage transition, append exactly: [STAGE:${nextStage}] at the very end (no spaces). Otherwise omit.`}`;
}

function getStageGuide(
  scenario: Scenario,
  stage: RoleplayStage,
  trustLevel: number
): string {
  const low = trustLevel < 40;
  const mid = trustLevel >= 40 && trustLevel < 65;

  if (scenario.type === "appointment_setting") {
    return APPOINTMENT_STAGE_GUIDE[stage]?.(low, mid) ?? defaultGuide(stage);
  }
  if (scenario.type === "fact_finding") {
    return FACT_FINDING_STAGE_GUIDE[stage]?.(low, mid) ?? defaultGuide(stage);
  }
  return PRODUCT_PITCH_STAGE_GUIDE[stage]?.(low, mid) ?? defaultGuide(stage);
}

type GuideMap = Partial<Record<RoleplayStage, (low: boolean, mid: boolean) => string>>;

const APPOINTMENT_STAGE_GUIDE: GuideMap = {
  opening: () =>
    `Answer the call curtly. You are Tsing Lu and you are busy. Ask who is calling and what this is about in one short sentence.`,

  permission_to_continue: (low) =>
    low
      ? `Challenge the trainee: express you have no time and ask pointedly why you should continue this call. Be direct and skeptical.`
      : `You can spare a moment but expect the trainee to be concise. Ask them to get to the point.`,

  needs_exploration: () =>
    `Ask what information the trainee needs about your situation before they can justify a meeting. You want to know the purpose before committing any time.`,

  objection_triggered: (low) =>
    low
      ? `Firmly restate your concern. Be direct about why this is a problem. Don't be hostile, but make them work to address it.`
      : `Acknowledge the trainee's response but keep your concern alive. Ask them to address it more concretely.`,

  value_reframe: (_, mid) =>
    mid
      ? `Show cautious interest. Ask them to show you one concrete, practical benefit relevant to your family situation.`
      : `Push back: give me one reason this meeting is worth my time. Be skeptical but fair.`,

  appointment_or_next_step: () =>
    `If the trainee proposes a meeting, ask for a specific time slot and exact agenda items. You want to know precisely what will be covered.`,

  closing: () =>
    `Confirm the appointment conditionally. State the time slot you are available and what you expect from the meeting.`,

  completed: () =>
    `Thank the trainee briefly and confirm the agreed next step. The conversation is concluding.`,
};

const FACT_FINDING_STAGE_GUIDE: GuideMap = {
  opening: () =>
    `You are open to a short conversation but prefer practical, direct questions. Greet them briefly and signal you don't have much time.`,

  permission_to_continue: (low) =>
    low
      ? `Be cautious: ask why they need this information and what they will do with it. You don't want to share personal details unnecessarily.`
      : `Ask them to clarify what areas they want to understand first before you share details.`,

  needs_exploration: () =>
    `Share that your main concerns are education planning for your children, medical cost coverage, and business cash flow stability. But wait for specific, well-framed questions before volunteering more.`,

  objection_triggered: () =>
    `A question felt too personal or premature. Ask how answering it will directly benefit you before you respond.`,

  value_reframe: () =>
    `If the trainee provides a clear, client-centered reason, indicate you are slightly more open. Ask them to be specific about the value of the information they need.`,

  appointment_or_next_step: () =>
    `Ask specifically what data they need next and how they will use it to identify protection gaps.`,

  closing: () =>
    `Ask them to summarize the main gaps they have identified so far and what they recommend reviewing next.`,

  completed: () =>
    `Confirm you will prepare the requested information for the next session. The conversation concludes.`,
};

const PRODUCT_PITCH_STAGE_GUIDE: GuideMap = {
  opening: () =>
    `You are listening but clearly skeptical of insurance pitches. Make it clear you don't want a generic product presentation — you want relevance to your situation.`,

  permission_to_continue: (low) =>
    low
      ? `Be skeptical. Ask them directly why you should hear this proposal now and what makes it different from others you've seen.`
      : `You'll listen, but make clear you expect the proposal to be relevant to your priorities, not a generic pitch.`,

  needs_exploration: () =>
    `Ask them to link their solution specifically to your education planning, medical coverage, and life protection concerns. Don't accept vague claims.`,

  objection_triggered: () =>
    `Express that the solution sounds expensive and you're not convinced it provides enough value. Be firm but not rude.`,

  value_reframe: (_, mid) =>
    mid
      ? `Ask them to show you the benefit-cost tradeoff in clear, specific terms — no jargon.`
      : `Demand practical proof this is not just another expense. What tangible outcome would you see?`,

  appointment_or_next_step: () =>
    `Ask for the concrete next steps if you were to evaluate this properly. What would the process look like?`,

  closing: () =>
    `If the numbers are reasonable, indicate you are willing to review a formal proposal. Ask them to send a summary.`,

  completed: () =>
    `Thank them and confirm you'll review the summary they'll send. The conversation concludes.`,
};

function defaultGuide(stage: RoleplayStage): string {
  return `Respond naturally and realistically as your persona would in the ${STAGE_META[stage].label} stage. Keep it brief and authentic.`;
}

// ─────────────────────────────────────────────────────────
// Enhanced Mock Engine (used when no OpenAI key)
// ─────────────────────────────────────────────────────────

// ── Utility: pick a non-repeating reply from a pool ────────
function pickReply(pool: string[], conversationLength: number): string {
  return pool[conversationLength % pool.length];
}

// ── Detect what the trainee said so we can react ────────────
function analyzeTraineeMessage(msg: string) {
  const m = msg.toLowerCase();
  return {
    askedQuestion: /\?/.test(msg),
    mentionedFamily: /keluarga|anak|istri|suami|family|children|wife|husband/i.test(m),
    mentionedBusiness: /bisnis|perusahaan|usaha|business|company/i.test(m),
    mentionedProduct: /asuransi|insurance|premi|premium|manfaat|benefit|proteksi|protection/i.test(m),
    showedEmpathy: /mengerti|saya paham|wajar|i understand|i see|that makes sense|fair enough/i.test(m),
    proposedMeeting: /pertemuan|jadwal|meeting|schedule|kapan|when|besok|tomorrow|minggu ini|this week/i.test(m),
    usedName: /tsing|bapak tsing|mr tsing|pak/i.test(m),
    veryShort: msg.trim().split(" ").length < 4,
    tooGeneric: /halo|hello|selamat|good morning|good afternoon|saya dari|i am from/i.test(m) && msg.trim().split(" ").length < 8,
  };
}

function scenarioMockReply(
  scenario: Scenario,
  stage: RoleplayStage,
  trustLevel: number,
  objectionDetected: string | null,
  lang: "en" | "id" = "en",
  conversationLength: number = 0,
  traineeMessage: string = ""
): string {
  const t = analyzeTraineeMessage(traineeMessage);
  const low = trustLevel < 40;
  const mid = trustLevel >= 40 && trustLevel < 65;

  // ── React to specific trainee behavior first ──────────────

  // Too short or vague → Tsing Lu gets impatient
  if (t.veryShort && conversationLength > 0) {
    if (lang === "id") {
      return pickReply([
        "Saya tidak yakin saya menangkap maksud Anda. Bisa lebih jelas?",
        "Maaf, agak singkat — apa yang sebenarnya ingin Anda sampaikan?",
        "Saya butuh lebih banyak detail dari itu.",
      ], conversationLength);
    }
    return pickReply([
      "I'm not sure I follow. Could you be more specific?",
      "That was quite brief — what are you actually trying to say?",
      "I need a bit more than that to respond properly.",
    ], conversationLength);
  }

  // Generic opening only → push them to get to the point
  if (t.tooGeneric && conversationLength <= 1) {
    if (lang === "id") {
      return pickReply([
        "Ya, halo. Langsung saja — ada apa?",
        "Selamat siang. Saya ada rapat sebentar lagi, jadi silakan langsung ke intinya.",
        "Halo. Waktu saya terbatas hari ini — ada yang bisa saya bantu?",
      ], conversationLength);
    }
    return pickReply([
      "Yes, hello. What's this about?",
      "Hello there. I have a meeting soon — please get straight to the point.",
      "Hi. My time is limited today — what can I do for you?",
    ], conversationLength);
  }

  // Empathy acknowledged → soften slightly
  if (t.showedEmpathy && trustLevel > 30) {
    if (lang === "id") {
      return pickReply([
        "Baik, saya dengar Anda. Lanjutkan — apa yang sebenarnya ingin Anda tawarkan?",
        "Saya hargai Anda memahami posisi saya. Jadi apa konkretnya?",
        "Oke, saya perhatikan. Sekarang tunjukkan bagaimana ini relevan untuk situasi saya.",
      ], conversationLength);
    }
    return pickReply([
      "Alright, I hear you. Go on — what exactly is it you're proposing?",
      "I appreciate that you understand my position. So what specifically are you offering?",
      "Okay, I'm listening. Now show me how this is relevant to my situation.",
    ], conversationLength);
  }

  // Mentioned family → engage slightly
  if (t.mentionedFamily && stage !== "opening") {
    if (lang === "id") {
      return pickReply([
        "Betul, anak-anak saya jadi prioritas utama. Tapi saya butuh angka konkret, bukan janji.",
        "Iya, soal pendidikan anak memang ada di pikiran saya. Bagaimana tepatnya Anda bisa membantu?",
        "Keluarga pasti jadi pertimbangan saya. Tapi dengan kondisi bisnis yang padat, saya perlu tahu nilainya dulu.",
      ], conversationLength);
    }
    return pickReply([
      "Yes, my children are a top priority. But I need concrete numbers, not promises.",
      "Right, education planning is something I think about. How exactly would you help with that?",
      "Family is important to me, but with a busy business I need to see the value first.",
    ], conversationLength);
  }

  // Mentioned business → engage on business angle
  if (t.mentionedBusiness && stage !== "opening") {
    if (lang === "id") {
      return pickReply([
        "Bisnis manufaktur itu punya risiko yang berbeda. Anda paham tentang kelangsungan bisnis?",
        "Iya, saya punya 47 karyawan. Kalau ada apa-apa dengan saya, bisnis harus tetap jalan. Itu yang saya pikirkan.",
        "Bisnis memang prioritas. Tapi saya harus pastikan tidak ada konflik kepentingan di sini.",
      ], conversationLength);
    }
    return pickReply([
      "Manufacturing has different risks. Do you understand business continuity planning?",
      "Yes, I have 47 employees. If something happens to me, the business must continue. That's what I think about.",
      "Business is a priority. But I need to make sure there's no conflict of interest here.",
    ], conversationLength);
  }

  // Proposed meeting → good sign, respond with mild interest
  if (t.proposedMeeting && stage !== "opening" && !low) {
    if (lang === "id") {
      return pickReply([
        "Pertemuan mungkin bisa dipertimbangkan. Tapi apa yang konkret akan kita bahas?",
        "Saya bisa luangkan waktu — tapi saya butuh tahu ini worth it dulu. Apa agendanya?",
        "Mungkin. Tapi saya perlu tahu lebih dulu — pertemuan seperti apa dan seberapa lama?",
      ], conversationLength);
    }
    return pickReply([
      "A meeting might be possible. But what exactly would we discuss?",
      "I could make time — but I need to know this is worth it first. What's the agenda?",
      "Perhaps. But I'd need to know — what kind of meeting and how long?",
    ], conversationLength);
  }

  // Objection raised → use objection-specific response
  if (objectionDetected) {
    if (lang === "id") {
      const objResponses = [
        `"${objectionDetected}" itu kekhawatiran nyata bagi saya. Bagaimana Anda menanggapinya secara konkret?`,
        `Saya sudah dengar banyak agen menjawab soal "${objectionDetected}" — apa yang membuat jawaban Anda berbeda?`,
        `Soal "${objectionDetected}" — saya butuh fakta, bukan retorika. Apa datanya?`,
        low
          ? `"${objectionDetected}" itu masalah utama saya. Saya belum yakin Anda paham situasi saya.`
          : `Kekhawatiran saya soal "${objectionDetected}" belum terjawab sepenuhnya. Coba lebih spesifik.`,
      ];
      return pickReply(objResponses, conversationLength);
    }
    const objResponses = [
      `"${objectionDetected}" is a real concern for me. How do you address that specifically?`,
      `I've heard many agents respond to "${objectionDetected}" — what makes your answer different?`,
      `On the "${objectionDetected}" point — I need facts, not rhetoric. What's the data?`,
      low
        ? `"${objectionDetected}" is my main issue. I'm not convinced you understand my situation.`
        : `My concern about "${objectionDetected}" isn't fully addressed yet. Be more specific.`,
    ];
    return pickReply(objResponses, conversationLength);
  }

  // ── Stage-based varied responses ─────────────────────────

  if (lang === "id") {
    const id: Partial<Record<RoleplayStage, string[]>> = {
      opening: [
        "Tsing Lu di sini. Saya sedang di tengah meeting — ini soal apa sebenarnya?",
        "Ya halo. Siapa ini? Saya tidak ingat pernah minta dihubungi.",
        "Halo. Saya punya 5 menit. Langsung saja.",
        "Tsing Lu. Bicara cepat, saya ada deadline.",
      ],
      permission_to_continue: [
        low
          ? "Waktu saya sangat terbatas. Kenapa saya harus terus mendengarkan ini?"
          : "Anda punya satu menit — langsung ke poin utamanya.",
        low
          ? "Saya belum jelas relevansinya untuk situasi saya. Tolong jelaskan."
          : "Saya mendengarkan, tapi saya perlu tahu ini relevan dulu.",
        low
          ? "Saya sudah sering dapat panggilan seperti ini. Apa yang beda dari Anda?"
          : "Baik. Apa yang paling penting untuk saya ketahui sekarang?",
        "Oke, lanjut. Tapi pastikan ini bukan penawaran generik.",
      ],
      needs_exploration: [
        "Prioritas saya: pendidikan anak, proteksi kesehatan, kelangsungan bisnis. Pertanyaan spesifik?",
        "Saya ada dua anak yang akan masuk kuliah dalam 8 tahun. Ini jadi pikiran saya. Anda bisa bantu bagaimana?",
        "Soal keuangan, saya lebih suka terstruktur dan terukur. Apa yang perlu Anda tahu dari saya?",
        mid
          ? "Bisnis saya sedang berkembang tapi juga punya risiko. Apa yang Anda rekomendasikan untuk situasi seperti ini?"
          : "Sebelum saya bagi detail, saya ingin tahu Anda sudah pahami situasi saya seperti apa.",
      ],
      objection_triggered: [
        "Jadwal saya penuh. Saya sudah punya asuransi dari tempat lain. Apa bedanya yang Anda tawarkan?",
        "Ini kedengarannya mahal. Cashflow bisnis saya ketat bulan ini.",
        "Saya perlu diskusikan ini dengan istri saya dulu. Dia yang lebih paham soal keuangan keluarga.",
        "Kirim brosurnya saja dulu — saya tidak bisa putuskan di telepon.",
        "Saya agak skeptis dengan asuransi. Terus terang, saya rasa ini lebih menguntungkan agen daripada nasabah.",
      ],
      value_reframe: [
        "Berikan satu angka konkret — berapa yang terproteksi dan berapa preminya?",
        "Saya butuh lihat perbandingan, bukan hanya janji. Apa bedanya dengan yang sudah ada?",
        mid
          ? "Oke, mungkin ada nilainya. Tapi saya butuh simulasi nyata sebelum bisa setuju apapun."
          : "Saya belum yakin. Beri saya alasan konkret untuk melanjutkan.",
        "Kalau memang sebagus itu, pasti ada orang yang sudah pakai dan berhasil. Anda punya referensi?",
      ],
      appointment_or_next_step: [
        "Kalau kita lanjut, saya mau ketemu langsung — bukan telepon. Dan bawa simulasi angkanya.",
        "Rabu atau Kamis mungkin bisa. Tapi ini harus singkat — maksimal 45 menit.",
        mid
          ? "Saya perlu lihat ilustrasi tertulis dulu sebelum jadwalkan pertemuan."
          : "Tolong kirimkan ringkasan tertulis dulu. Saya akan pelajari sebelum setuju ketemu.",
        "Oke, saya pertimbangkan. Tapi saya butuh agenda yang jelas — bukan meeting umum.",
      ],
      closing: [
        "Baik. Konfirmasi waktunya dan kirimkan agenda. Saya akan minta asisten saya blokir jadwalnya.",
        "Setuju untuk langkah selanjutnya. Tapi saya harap tidak ada informasi yang berubah saat kita ketemu.",
        "Oke, saya berikan kesempatan. Jangan buang waktu saya.",
        "Baik, saya tunggu materialnya. Kalau angkanya masuk akal, kita bisa diskusi lebih lanjut.",
      ],
      completed: [
        "Baik. Saya menunggu konfirmasi dari Anda. Tepat waktu ya.",
        "Mengerti. Saya akan siapkan pertanyaan untuk pertemuan kita.",
        "Terima kasih. Saya harap ini investasi waktu yang worthwhile.",
        "Oke. Saya tunggu. Jangan lupa bawa data yang relevan.",
      ],
    };
    const pool = id[stage];
    if (pool) return pickReply(pool, conversationLength);
    return pickReply([
      "Hmm, saya perlu lebih banyak informasi sebelum bisa berkomentar.",
      "Bisa Anda jelaskan lebih spesifik?",
      "Saya tidak yakin saya memahami maksud Anda.",
    ], conversationLength);
  }

  // English
  const en: Partial<Record<RoleplayStage, string[]>> = {
    opening: [
      "Tsing Lu here. I'm in the middle of something — what is this about exactly?",
      "Hello. Who is this? I don't recall requesting a call.",
      "Hi. I have 5 minutes. Get to the point please.",
      "Tsing Lu. Talk fast, I'm on a deadline.",
    ],
    permission_to_continue: [
      low
        ? "My time is very limited. Why should I keep listening to this?"
        : "You have one minute — what's the main point?",
      low
        ? "I'm not clear on how this is relevant to me. Please explain."
        : "I'm listening, but I need to know this is relevant first.",
      low
        ? "I get a lot of calls like this. What makes you different?"
        : "Alright. What's the most important thing I should know right now?",
      "Okay, continue. But make sure this isn't a generic pitch.",
    ],
    needs_exploration: [
      "My priorities: children's education, health protection, business continuity. Specific questions?",
      "I have two children entering university in about 8 years. That's what I think about. How can you help?",
      "Financially I prefer structured and measurable solutions. What do you need to know from me?",
      mid
        ? "My business is growing but carries risks. What would you recommend for a situation like mine?"
        : "Before I share details, I want to know how well you understand my situation.",
    ],
    objection_triggered: [
      "My schedule is packed. I already have coverage elsewhere. What's actually different here?",
      "This sounds expensive. My business cashflow is tight this month.",
      "I need to discuss this with my wife first — she handles our family finances.",
      "Just send me the brochure first — I can't decide over the phone.",
      "I'm skeptical about insurance, honestly. I think it benefits the agent more than the client.",
    ],
    value_reframe: [
      "Give me one concrete number — how much coverage and what's the premium?",
      "I need to see a comparison, not just promises. How is this different from what I have?",
      mid
        ? "Okay, maybe there's value here. But I need actual projections before agreeing to anything."
        : "I'm not convinced yet. Give me a concrete reason to continue.",
      "If it's really that good, someone must be using it successfully. Can you share a reference?",
    ],
    appointment_or_next_step: [
      "If we continue, I want to meet in person — not by phone. And bring actual numbers.",
      "Wednesday or Thursday might work. But keep it short — 45 minutes maximum.",
      mid
        ? "I need to see a written illustration first before scheduling a meeting."
        : "Please send a written summary first. I'll review it before agreeing to meet.",
      "Okay, I'll consider it. But I need a clear agenda — not a generic meeting.",
    ],
    closing: [
      "Alright. Confirm the time and send the agenda. I'll ask my PA to block it.",
      "Agreed on next steps. I just hope the information stays consistent when we meet.",
      "Fine, I'll give it a chance. Don't waste my time.",
      "Okay, send me the materials. If the numbers make sense, we can discuss further.",
    ],
    completed: [
      "Good. I'm waiting for your confirmation. Be on time.",
      "Understood. I'll prepare questions for our meeting.",
      "Thank you. I hope this turns out to be worthwhile.",
      "Okay. I'll wait. Don't forget to bring relevant data.",
    ],
  };
  const pool = en[stage];
  if (pool) return pickReply(pool, conversationLength);
  return pickReply([
    "Hmm, I need more information before I can respond to that.",
    "Could you be more specific about that?",
    "I'm not sure I follow what you mean.",
  ], conversationLength);
}


export function generateMockRoleplayReply(
  input: RoleplayRespondRequest
): RoleplayRespondResponse {
  const lang = input.lang ?? "en";
  const scenario = MVP_SCENARIOS.find((s) => s.id === input.scenarioId) ?? MVP_SCENARIOS[0];
  const objection = detectObjection(input.traineeMessage);
  const positive = detectPositiveSignal(input.traineeMessage);

  const currentStage: RoleplayStage = input.currentStage ?? "opening";
  const stageHistory: RoleplayStage[] = input.stageHistory?.length
    ? input.stageHistory
    : [currentStage];
  const objectionHistory = input.objectionHistory ?? [];

  // Count how many consecutive turns we've been in this stage
  const stageRepeatCount = (() => {
    let count = 0;
    for (let i = stageHistory.length - 1; i >= 0; i--) {
      if (stageHistory[i] === currentStage) count++;
      else break;
    }
    return count;
  })();

  const baseTrust = clamp(28 + input.conversation.length * 2, 10, 85);
  const trustLevel = computeTrustLevel(baseTrust, 0, positive, !!objection);

  const nextStage = computeNextStage({
    currentStage,
    stageRepeatCount,
    trustLevel,
    objectionDetected: !!objection,
    positiveSignal: positive,
  });

  const updatedHistory =
    stageHistory[stageHistory.length - 1] === nextStage
      ? stageHistory
      : [...stageHistory, nextStage];

  const updatedObjectionHistory = objection
    ? [...objectionHistory, objection]
    : objectionHistory;

  const reply = scenarioMockReply(
    scenario, nextStage, trustLevel, objection, lang,
    input.conversation.length,
    input.traineeMessage
  );

  const fallback =
    lang === "id"
      ? "Bisakah Anda jelaskan bagaimana ini membantu prioritas keuangan saya secara spesifik?"
      : "Can you clarify how this specifically helps my financial priorities?";

  return {
    reply: reply || fallback,
    objectionRaised: objection,
    trustLevel,
    currentStage,
    nextStage,
    stageHistory: updatedHistory,
    objectionHistory: updatedObjectionHistory,
    mode: "mock",
  };
}

// ─────────────────────────────────────────────────────────
// Score Generator (mock)
// ─────────────────────────────────────────────────────────

export function generateMockScore(input: RoleplayScoreRequest): RoleplayScoreResponse {
  const traineeMessages = input.transcript.filter((m) => m.role === "trainee");
  const aiMessages = input.transcript.filter((m) => m.role === "ai_client");
  const allTraineeText = traineeMessages.map((m) => m.content.toLowerCase()).join(" ");
  const lang = (input as RoleplayScoreRequest & { lang?: string }).lang ?? "en";
  const isId = lang === "id";

  // ── Per-category signal analysis ───────────────────────

  // 1. communication_clarity — sentence structure, no filler words, clear intent
  const fillerCount = (allTraineeText.match(/\b(um|uh|err|hmm|like|basically|actually)\b/g) ?? []).length;
  const avgWordCount = traineeMessages.length
    ? allTraineeText.split(" ").length / traineeMessages.length
    : 0;
  const clarityScore = clamp(
    50 + (avgWordCount > 8 ? 15 : 0) + (fillerCount === 0 ? 10 : -fillerCount * 3) +
    (traineeMessages.length >= 3 ? 10 : 0),
    25, 92
  );

  // 2. rapport_building — greetings, name usage, personalization
  const hasGreeting = /halo|selamat|perkenalkan|good morning|good afternoon|hello|hi\b|dear|pak|bu/i.test(allTraineeText);
  const usesName = /tsing|bapak tsing|mr\. tsing|pak/i.test(allTraineeText);
  const hasPersonal = /keluarga|family|bisnis|business|anak|children|kabar|how are/i.test(allTraineeText);
  const rapportScore = clamp(
    30 + (hasGreeting ? 20 : 0) + (usesName ? 15 : 0) + (hasPersonal ? 15 : 0) +
    clamp((traineeMessages.length - 1) * 3, 0, 15),
    25, 92
  );

  // 3. empathy — acknowledgment phrases, emotional validation
  const empathyPhrases = /mengerti|saya paham|i understand|i see|that makes sense|fair enough|valid|masuk akal|concern|khawatir|appreciate|terima kasih atas|wajar/i;
  const empathyCount = traineeMessages.filter((m) => empathyPhrases.test(m.content)).length;
  const empathyScore = clamp(25 + empathyCount * 18 + (traineeMessages.length > 2 ? 10 : 0), 25, 92);

  // 4. needs_discovery — open questions, discovery intent
  const questionCount = traineeMessages.filter((m) => /\?/.test(m.content)).length;
  const discoveryWords = /apa|siapa|mengapa|bagaimana|berapa|kapan|what|why|how|when|who|which|ceritakan|tell me|share|prioritas|kebutuhan|tujuan|rencana|goal|plan|need/i;
  const discoveryCount = traineeMessages.filter((m) => discoveryWords.test(m.content)).length;
  const needsScore = clamp(20 + questionCount * 12 + discoveryCount * 8, 25, 92);

  // 5. objection_handling — reframing, "justru", turning objections around
  const hasObjectionFromAI = aiMessages.some((m) =>
    /sibuk|busy|tidak butuh|already|mahal|expensive|nanti|later|pikir|think|tidak tertarik|not interested/i.test(m.content)
  );
  const handledObjection = traineeMessages.some((m) =>
    /justru|sebenarnya|faktanya|manfaatnya|bayangkan|imagine|understand.*but|mengerti.*namun|precisely|tepat|itulah mengapa|that.s why|for that reason/i.test(m.content)
  );
  const objectionScore = clamp(
    (hasObjectionFromAI ? 25 : 45) + (handledObjection ? 35 : 0) + (traineeMessages.length > 3 ? 10 : 0),
    25, 92
  );

  // 6. product_explanation — product references, benefit language
  const productWords = /asuransi|insurance|manfaat|benefit|proteksi|protection|premi|premium|polis|policy|coverage|klaim|claim|nilai|value|solusi|solution/i;
  const productCount = traineeMessages.filter((m) => productWords.test(m.content)).length;
  const productScore = clamp(25 + productCount * 15 + (productCount >= 2 ? 10 : 0), 25, 92);

  // 7. closing_ability — appointment, next step language
  const closingWords = /janji|jadwal|appointment|schedule|kapan|when|bisa kita|shall we|lanjutkan|continue|pertemuan|meeting|next step|langkah|konfirmasi|confirm/i;
  const hasClosed = traineeMessages.some((m) => closingWords.test(m.content));
  const closingScore = clamp(
    25 + (hasClosed ? 40 : 0) + (traineeMessages.length >= 4 ? 10 : 0),
    25, 92
  );

  // 8. compliance_awareness — no pressure, professional tone, no false promises
  const pressureWords = /harus|must|you need to|wajib|sekarang juga|right now|segera|immediately|rugi jika tidak|lose out/i;
  const hasPressure = pressureWords.test(allTraineeText);
  const complianceScore = clamp(
    75 - (hasPressure ? 30 : 0) + (traineeMessages.length >= 2 ? 5 : 0),
    25, 92
  );

  // ── Assemble categories with specific per-score feedback ──

  type CategoryKey = ScoreCategory["key"];

  const FEEDBACK: Record<CategoryKey, (score: number) => string> = {
    communication_clarity: (s) => {
      if (s >= 75) return isId ? "Komunikasi terstruktur dan jelas, mudah diikuti prospek." : "Well-structured and clear — easy for the prospect to follow.";
      if (s >= 55) return isId ? "Beberapa kalimat terlalu panjang atau tidak fokus. Coba persingkat poin utama." : "Some sentences were too long or unfocused. Try to sharpen your key points.";
      return isId ? "Komunikasi perlu lebih terstruktur — gunakan kalimat pendek dan tujuan yang jelas di setiap giliran." : "Communication needs more structure — use shorter sentences with a clear purpose each turn.";
    },
    rapport_building: (s) => {
      if (s >= 75) return isId ? "Membangun kedekatan dengan baik — menyebut nama dan konteks personal prospek." : "Good rapport built — you referenced the prospect's name and personal context.";
      if (s >= 50) return isId ? "Salam sudah ada, tapi personalisasi bisa ditingkatkan." : "Greeting was present, but more personalization would strengthen the connection.";
      return isId ? "Mulai percakapan dengan lebih personal — sebut nama, tunjukkan minat pada situasi mereka." : "Open more personally — use their name and show genuine interest in their situation.";
    },
    empathy: (s) => {
      if (s >= 75) return isId ? "Empati ditunjukkan dengan baik — mengakui perspektif prospek sebelum melanjutkan." : "Empathy well demonstrated — you acknowledged the prospect's perspective before proceeding.";
      if (s >= 50) return isId ? "Ada sedikit pengakuan, tapi bisa lebih sering digunakan." : "Some acknowledgment present, but could be used more consistently.";
      return isId ? "Tambahkan frasa empati sebelum setiap respons — 'Saya mengerti' atau 'Wajar jika Anda merasa...' sangat membantu membangun kepercayaan." : "Add empathy phrases before each response — 'I understand' or 'That's a fair concern' builds trust significantly.";
    },
    needs_discovery: (s) => {
      if (s >= 75) return isId ? "Penggalian kebutuhan baik — pertanyaan terbuka digunakan secara efektif." : "Good needs discovery — open-ended questions used effectively.";
      if (s >= 50) return isId ? "Beberapa pertanyaan sudah ada, tapi masih bisa lebih mendalam." : "Some questions asked, but discovery could go deeper.";
      return isId ? "Ajukan lebih banyak pertanyaan terbuka: 'Apa prioritas keuangan utama Bapak saat ini?' sebelum menawarkan solusi." : "Ask more open questions: 'What is your main financial priority right now?' before offering solutions.";
    },
    objection_handling: (s) => {
      if (s >= 75) return isId ? "Keberatan ditangani dengan efektif — reframing nilai dilakukan dengan baik." : "Objections handled effectively — value reframing was well executed.";
      if (s >= 50) return isId ? "Ada upaya menangani keberatan, tapi bisa lebih terstruktur dengan teknik Feel-Felt-Found." : "Objection handling attempted, but could be more structured using Feel-Felt-Found technique.";
      if (!hasObjectionFromAI) return isId ? "Tidak ada keberatan yang muncul dalam sesi ini — latih skenario dengan keberatan lebih banyak." : "No objections arose in this session — practice scenarios with more resistance.";
      return isId ? "Keberatan muncul tapi belum ditangani dengan reframing. Coba: 'Justru karena Bapak sibuk, solusi ini bisa melindungi tanpa perlu repot...'" : "Objection arose but wasn't reframed. Try: 'That's precisely why this solution protects you without adding complexity...'";
    },
    product_explanation: (s) => {
      if (s >= 75) return isId ? "Produk dijelaskan dengan relevan terhadap kebutuhan prospek." : "Product explained with clear relevance to the prospect's needs.";
      if (s >= 50) return isId ? "Penjelasan produk ada, tapi bisa dikaitkan lebih langsung dengan kebutuhan spesifik yang digali." : "Product explanation present, but could be tied more directly to discovered needs.";
      return isId ? "Hindari penjelasan produk generik — kaitkan setiap manfaat langsung dengan situasi spesifik Pak Tsing Lu." : "Avoid generic product explanation — link every benefit directly to Tsing Lu's specific situation.";
    },
    closing_ability: (s) => {
      if (s >= 75) return isId ? "Langkah berikutnya diusulkan dengan jelas dan percaya diri." : "Next step proposed clearly and confidently.";
      if (s >= 50) return isId ? "Ada upaya untuk menutup, tapi bisa lebih tegas dan spesifik." : "Closing attempted but could be more assertive and specific.";
      return isId ? "Akhiri setiap sesi dengan langkah konkret: 'Bisa kita jadwalkan pertemuan 30 menit minggu ini?'" : "End every session with a concrete next step: 'Can we schedule a 30-minute meeting this week?'";
    },
    compliance_awareness: (s) => {
      if (s >= 75) return isId ? "Perilaku profesional dan etis sepanjang percakapan." : "Professional and ethical behavior throughout the conversation.";
      if (s >= 55) return isId ? "Umumnya profesional — pastikan tidak ada janji berlebihan." : "Generally professional — ensure no overpromising.";
      return isId ? "Hindari bahasa yang menekan atau janji yang tidak dapat dijamin — jaga profesionalisme." : "Avoid pressure language or unverifiable promises — maintain professional standards.";
    },
  };

  const scoreMap: Record<CategoryKey, number> = {
    communication_clarity: clarityScore,
    rapport_building: rapportScore,
    empathy: empathyScore,
    needs_discovery: needsScore,
    objection_handling: objectionScore,
    product_explanation: productScore,
    closing_ability: closingScore,
    compliance_awareness: complianceScore,
  };

  const categories: ScoreCategory[] = (
    Object.keys(SCORE_CATEGORY_TEXT) as CategoryKey[]
  ).map((key) => ({
    key,
    label: SCORE_CATEGORY_TEXT[key],
    score: scoreMap[key],
    feedback: FEEDBACK[key](scoreMap[key]),
  }));

  const overallScore = Math.round(
    categories.reduce((sum, c) => sum + c.score, 0) / categories.length
  );

  // ── Derive strengths + improvements from actual scores ──

  const sorted = [...categories].sort((a, b) => b.score - a.score);
  const topTwo = sorted.slice(0, 2);
  const bottomTwo = sorted.slice(-2);

  const STRENGTH_TEXT: Record<CategoryKey, string> = {
    communication_clarity: isId ? "Komunikasi terstruktur dan mudah dipahami" : "Clear and structured communication",
    rapport_building: isId ? "Membangun kedekatan dengan prospek secara personal" : "Built personal rapport with the prospect",
    empathy: isId ? "Menunjukkan empati yang tulus terhadap perspektif klien" : "Demonstrated genuine empathy toward client's perspective",
    needs_discovery: isId ? "Menggali kebutuhan klien dengan pertanyaan terbuka yang efektif" : "Effectively uncovered client needs with open questions",
    objection_handling: isId ? "Menangani keberatan dengan reframing yang baik" : "Handled objections with effective reframing",
    product_explanation: isId ? "Menjelaskan produk dengan relevan terhadap kebutuhan klien" : "Explained product benefits with client-relevant context",
    closing_ability: isId ? "Mengusulkan langkah berikutnya dengan jelas dan percaya diri" : "Proposed a clear and confident next step",
    compliance_awareness: isId ? "Menjaga perilaku profesional dan etis sepanjang sesi" : "Maintained professional and ethical conduct throughout",
  };

  const IMPROVE_TEXT: Record<CategoryKey, string> = {
    communication_clarity: isId ? "Persingkat kalimat dan fokuskan pesan utama di setiap respons" : "Shorten sentences and focus on one key message per response",
    rapport_building: isId ? "Personalisasikan percakapan lebih — sebut nama dan konteks situasi mereka" : "Personalize more — use their name and reference their specific situation",
    empathy: isId ? "Selalu akui perspektif prospek sebelum memberikan informasi atau solusi" : "Always acknowledge the prospect's perspective before offering information",
    needs_discovery: isId ? "Ajukan lebih banyak pertanyaan terbuka sebelum beralih ke solusi" : "Ask more open-ended discovery questions before moving to solutions",
    objection_handling: isId ? "Gunakan teknik Feel-Felt-Found untuk merespons setiap keberatan secara terstruktur" : "Apply Feel-Felt-Found technique to address each objection systematically",
    product_explanation: isId ? "Kaitkan setiap fitur produk langsung dengan kebutuhan spesifik yang sudah digali" : "Link every product feature directly to the specific needs you uncovered",
    closing_ability: isId ? "Akhiri dengan usulan langkah konkret yang jelas: waktu dan format pertemuan" : "Close with a specific concrete next step: time and format of the meeting",
    compliance_awareness: isId ? "Hindari bahasa yang terkesan memaksa atau menjanjikan hal yang tidak bisa dijamin" : "Avoid any pressure language or promises that cannot be guaranteed",
  };

  const strengths = topTwo.map((c) => STRENGTH_TEXT[c.key]);
  const improvementAreas = bottomTwo.reverse().map((c) => IMPROVE_TEXT[c.key]);

  // ── Suggested better response: based on weakest category ──
  const weakest = bottomTwo[0];
  const SUGGESTED: Record<CategoryKey, string> = {
    communication_clarity: isId
      ? `"Pak Tsing, tujuan saya hari ini ada tiga: perkenalan singkat, mendengar prioritas Bapak, dan melihat apakah ada nilai yang bisa saya tawarkan. Boleh saya mulai?"`
      : `"Mr. Tsing, my goal today has three parts: a quick intro, listening to your priorities, and seeing if I can offer value. May I begin?"`,
    rapport_building: isId
      ? `"Pak Tsing, saya sempat baca bahwa bisnis manufaktur Bapak sudah berkembang pesat. Bagaimana kondisi bisnis saat ini — apakah sudah ada rencana proteksinya?"`
      : `"Mr. Tsing, I understand your manufacturing business has grown significantly. How is business these days — do you have any protection plan in place?"`,
    empathy: isId
      ? `"Saya sangat mengerti, Pak Tsing. Wajar jika Bapak merasa belum perlu — banyak pengusaha sukses berpikir sama sampai situasi tertentu mengubah segalanya. Boleh saya ceritakan satu kasus nyata?"`
      : `"I completely understand, Mr. Tsing. Many successful business owners feel the same way — until something changes everything. May I share a real case?"`,
    needs_discovery: isId
      ? `"Pak Tsing, dari semua prioritas Bapak — pendidikan anak, kesehatan keluarga, kelangsungan bisnis — mana yang paling Bapak pikirkan saat ini?"`
      : `"Mr. Tsing, among all your priorities — children's education, family health, business continuity — which one keeps you up at night the most?"`,
    objection_handling: isId
      ? `"Justru karena Bapak sangat sibuk, Pak Tsing — solusi yang saya rekomendasikan bisa berjalan otomatis tanpa perlu Bapak urus setiap hari. Apakah Bapak mau saya tunjukkan caranya dalam 10 menit?"`
      : `"That's precisely because you're so busy, Mr. Tsing — the solution I recommend runs automatically without needing your daily attention. Can I show you how in 10 minutes?"`,
    product_explanation: isId
      ? `"Berdasarkan apa yang Bapak ceritakan — dua anak yang akan kuliah dan bisnis yang perlu dilindungi — saya rekomendasikan satu produk yang menutupi keduanya sekaligus, dengan premi yang bisa disesuaikan dengan cashflow bisnis Bapak."`
      : `"Based on what you shared — two children approaching college age and a business that needs continuity — I recommend one product that covers both, with premiums that flex with your business cashflow."`,
    closing_ability: isId
      ? `"Pak Tsing, berdasarkan percakapan kita hari ini, saya bisa siapkan ilustrasi yang spesifik untuk situasi Bapak. Apakah Rabu atau Kamis minggu ini, pagi atau sore, lebih nyaman untuk Bapak?"`
      : `"Mr. Tsing, based on today's conversation, I can prepare an illustration specific to your situation. Would Wednesday or Thursday this week work better — morning or afternoon?"`,
    compliance_awareness: isId
      ? `"Saya tidak ingin memberikan tekanan apapun, Pak Tsing. Tujuan saya hanya memastikan Bapak punya informasi yang lengkap untuk membuat keputusan terbaik bagi keluarga dan bisnis Bapak."`
      : `"I don't want to pressure you at all, Mr. Tsing. My only goal is to make sure you have complete information to make the best decision for your family and business."`,
  };

  // ── Next recommended practice: based on scenario + weaknesses ──
  const scenarioId = input.scenarioId;
  let nextPractice: string;
  const weakKey = weakest?.key;
  if (isId) {
    if (weakKey === "needs_discovery" || weakKey === "empathy") {
      nextPractice = "Latih skenario Fact Finding — fokus mengajukan minimal 5 pertanyaan terbuka sebelum menyebut produk apapun.";
    } else if (weakKey === "objection_handling") {
      nextPractice = "Ulangi skenario ini dengan fokus pada teknik Feel-Felt-Found untuk merespons setiap keberatan dalam 2 kalimat atau kurang.";
    } else if (weakKey === "closing_ability") {
      nextPractice = "Latih skenario Appointment Setting — fokus pada penutupan dengan dua pilihan waktu yang konkret di setiap percakapan.";
    } else if (scenarioId === "scenario-appointment-setting") {
      nextPractice = "Lanjutkan ke skenario Fact Finding — Anda sudah membangun pembukaan yang baik, sekarang dalami teknik menggali kebutuhan.";
    } else if (scenarioId === "scenario-fact-finding") {
      nextPractice = "Lanjutkan ke Product Pitch — gunakan data yang digali di Fact Finding untuk presentasi yang personal dan relevan.";
    } else {
      nextPractice = "Ulangi skenario ini dengan target overall score di atas 70 — fokus pada area terendah Anda saat ini.";
    }
  } else {
    if (weakKey === "needs_discovery" || weakKey === "empathy") {
      nextPractice = "Practice the Fact Finding scenario — focus on asking at least 5 open questions before mentioning any product.";
    } else if (weakKey === "objection_handling") {
      nextPractice = "Repeat this scenario focusing on the Feel-Felt-Found technique — address each objection in 2 sentences or less.";
    } else if (weakKey === "closing_ability") {
      nextPractice = "Practice Appointment Setting — focus on closing with two concrete time options in every conversation.";
    } else if (scenarioId === "scenario-appointment-setting") {
      nextPractice = "Move to Fact Finding — you've built a good opening, now deepen your needs discovery technique.";
    } else if (scenarioId === "scenario-fact-finding") {
      nextPractice = "Move to Product Pitch — use the needs you discovered to deliver a personal, relevant presentation.";
    } else {
      nextPractice = "Repeat this scenario targeting an overall score above 70 — focus on your lowest-scoring area.";
    }
  }

  return {
    report: {
      sessionId: input.sessionId,
      overallScore,
      categories,
      strengths,
      improvementAreas,
      suggestedBetterResponse: SUGGESTED[weakest?.key ?? "empathy"],
      nextRecommendedPractice: nextPractice,
      personaId: DEFAULT_PERSONA.id,
      scenarioId: input.scenarioId,
    } as RoleplayScoreResponse["report"],
    mode: "mock",
  };
}

