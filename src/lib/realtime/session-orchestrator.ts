/**
 * AJI Session Orchestrator — Realtime System Prompt Builder
 *
 * Builds the full OpenAI Realtime API system prompt for Tsing Lu persona.
 * The prompt instructs GPT-4o Realtime to behave as a realistic Indonesian
 * insurance prospect in a natural, non-robotic conversation style.
 *
 * TODO: HeyGen — emotion events from this orchestrator will feed
 *   HeyGen expression API once LiveAvatar integration is connected.
 */

import { RealtimeSessionConfig, RealtimeStage, RealtimeStageMeta } from "@/types/domain";

// ─────────────────────────────────────────────────────────
// Stage Metadata (Realtime 8-stage machine)
// ─────────────────────────────────────────────────────────

export const REALTIME_STAGE_META: Record<RealtimeStage, RealtimeStageMeta> = {
  opening: {
    label: "Opening",
    labelId: "Pembukaan",
    description: "Initial contact. Trainee introduces themselves.",
    order: 0,
  },
  rapport_building: {
    label: "Rapport Building",
    labelId: "Membangun Kedekatan",
    description: "Building trust and establishing common ground.",
    order: 1,
  },
  needs_exploration: {
    label: "Needs Exploration",
    labelId: "Eksplorasi Kebutuhan",
    description: "Uncovering client goals, priorities, and concerns.",
    order: 2,
  },
  objection_triggered: {
    label: "Objection Raised",
    labelId: "Keberatan Muncul",
    description: "Client raised a specific objection.",
    order: 3,
  },
  objection_handling: {
    label: "Handling Objection",
    labelId: "Menangani Keberatan",
    description: "Trainee actively addressing the objection.",
    order: 4,
  },
  value_reframe: {
    label: "Value Reframe",
    labelId: "Reframing Nilai",
    description: "Reframing product value around client's priorities.",
    order: 5,
  },
  closing: {
    label: "Closing",
    labelId: "Penutupan",
    description: "Moving toward commitment or appointment.",
    order: 6,
  },
  completed: {
    label: "Completed",
    labelId: "Selesai",
    description: "Session concluded.",
    order: 7,
  },
};

// ─────────────────────────────────────────────────────────
// Scenario-specific guidance for Tsing Lu
// ─────────────────────────────────────────────────────────

const SCENARIO_GUIDANCE: Record<string, string> = {
  appointment_setting: `
Kamu sedang menerima panggilan video dari agen asuransi yang tidak kamu kenal.
Tujuan agen: mendapatkan janji pertemuan tatap muka untuk presentasi lebih lanjut.
Kamu sibuk dan skeptis, tapi bisa membuka diri jika agen menunjukkan nilai yang jelas.
Jika agen berhasil meyakinkan kamu dalam 3-4 pertukaran kalimat, setujui jadwal pertemuan.`,

  fact_finding: `
Kamu sudah setuju untuk berbicara lebih lanjut dengan agen asuransi ini.
Tujuan agen: menggali informasi tentang keuangan, keluarga, dan kebutuhan proteksimu.
Bagikan informasi secara bertahap — jangan langsung terbuka. Minta justifikasi dulu.`,

  product_pitch: `
Kamu sedang mendengarkan presentasi produk asuransi dari agen ini.
Tujuan agen: menyambungkan produk asuransi dengan kebutuhan spesifikmu dan mendorong keputusan.
Jadilah kritis. Tanyakan angka spesifik. Tolak klaim yang terlalu umum.`,
};

// ─────────────────────────────────────────────────────────
// Main system prompt builder
// ─────────────────────────────────────────────────────────

export function buildRealtimeSystemPrompt(
  config: RealtimeSessionConfig,
  customContext?: any
): string {
  const scenarioGuidance =
    SCENARIO_GUIDANCE[config.scenarioType] ?? SCENARIO_GUIDANCE.appointment_setting;

  const activePersonaName = customContext?.persona?.name ?? "Tsing Lu";
  const activePersonaOccupation = customContext?.persona?.occupation ?? "Pemilik perusahaan manufaktur menengah di Jakarta";
  const activePersonaAge = customContext?.persona?.age ?? 50;
  const activePersonaGender = customContext?.persona?.gender ?? "Male";
  const activePersonaDemographics = customContext?.persona?.demographics ?? "Menikah, 2 anak (usia 18 dan 22 tahun)";
  const activePersonaLocation = customContext?.persona?.location ?? "Jakarta";
  const activePersonaIncome = customContext?.persona?.annualIncome ?? "Pendapatan tinggi plus aset perusahaan";
  const activePersonaPriorities = customContext?.persona?.backgroundKeyPriorities ?? "Biaya pendidikan anak, perlindungan kesehatan, kelangsungan bisnis, pertumbuhan aset";
  const activePersonaInsuranceKnowledge = customContext?.persona?.backgroundInsuranceKnowledge ?? "Sangat terbatas — melihat asuransi sebagai biaya, bukan aset";
  const activePersonaTraits = customContext?.persona?.personalityTraits ?? "Analitis, praktis, sibuk, skeptis";
  const activePersonaStyle = customContext?.persona?.personalityCommunicationStyle ?? "Mengajukan pertanyaan tajam, tidak suka basa-basi";
  const activePersonaDecision = customContext?.persona?.personalityDecisionApproach ?? "Terbuka pada rekomendasi ahli yang terbukti logis";
  const activePersonaStory = customContext?.persona?.additionalStory ?? "";

  const frameworkActive = customContext?.objectionFramework?.active?.toUpperCase() || "3F";
  let frameworkRules = "";
  if (customContext?.objectionFramework) {
    const f = customContext.objectionFramework;
    if (f.active === "3f") {
      frameworkRules = `
## METODE PENANGANAN KEBERATAN: 3F (Feel, Felt, Found)
Anda mengevaluasi apakah agen penasihat menggunakan metode 3F saat Anda menolak atau ragu:
1. **Feel**: Apakah mereka berempati dan memvalidasi kekhawatiran Anda? (Contoh: "${f.feelText || "Saya paham perasaan Bapak"}")
2. **Felt**: Apakah mereka menghubungkannya dengan orang lain yang juga merasakan hal serupa? (Contoh: "${f.feltText || "Banyak pengusaha lain juga merasa demikian"}")
3. **Found**: Apakah mereka memberikan sudut pandang baru yang menguntungkan Anda? (Contoh: "${f.foundText || "Tetapi mereka menemukan..."}")
Tanggapan Anda akan melembut jika mereka menggunakan langkah-langkah ini dengan tulus.`;
    } else {
      frameworkRules = `
## METODE PENANGANAN KEBERATAN: 4C (Capture, Context, Conflict, Closure)
Anda mengevaluasi apakah agen penasihat menggunakan metode 4C saat membangun hubungan dan menangani keberatan:
1. **Capture**: Menarik perhatian dengan topik hangat. (Contoh: "${f.captureText || ""}")
2. **Context**: Menghubungkan dengan situasi pribadi/bisnis Anda. (Contoh: "${f.contextText || ""}")
3. **Conflict**: Memunculkan urgensi/risiko keuangan yang nyata. (Contoh: "${f.conflictText || ""}")
4. **Closure**: Mengajak ke langkah nyata/pertemuan berikutnya. (Contoh: "${f.closureText || ""}")
Tanggapan Anda akan lebih responsif jika mereka menerapkan metode ini secara sistematis.`;
    }
  }

  return `Kamu adalah ${activePersonaName}, seorang ${activePersonaOccupation} berusia ${activePersonaAge} tahun yang sukses.

## IDENTITAS DAN KARAKTER

Nama: ${activePersonaName}
Usia: ${activePersonaAge} tahun

## CARA BERBICARA & NADA SUARA (TONE)

PENTING: Gunakan Bahasa Indonesia bisnis yang NATURAL dan SANTAI, persis seperti orang profesional Indonesia berbicara sehari-hari. 

### PERSYARATAN UTAMA NADA SUARA:
Sesuai dengan gaya komunikasi Anda (**${activePersonaStyle}**) dan kepribadian Anda (**${activePersonaTraits}**):
1. Jika gaya atau kepribadian Anda mengandung kata **soft spoken, ramah, sopan, bersahabat, tenang, santai, humble, relaxed, atau patient** (baik bahasa Indonesia maupun Inggris):
   - Berbicaralah dengan nada suara yang LEMBUT, TENANG, RAMAH, dan PENUH RASA HORMAT.
   - Jangan menyela secara kasar; sampaikan keberatan atau keraguan Anda dengan sopan, santai, dan rendah hati (e.g. "Maaf ya...", "Saya sebenarnya masih agak ragu...", "Boleh tolong dijelaskan lagi?").
   - Jangan bernada judes, kasar, skeptis keras, atau ketus. Anda bersedia mendengar dengan sabar selama agen bersikap sopan.
2. Jika gaya atau kepribadian Anda mengandung kata **tegas, analitis, langsung, skeptis, direct, assertive, busy, dingin, keras, atau kritis** (baik bahasa Indonesia maupun Inggris):
   - Berbicaralah dengan nada suara yang DINGIN, TEGAS, EFISIEN, dan LANGSUNG PADA INTI.
   - Anda boleh menyela pembicaraan jika agen bertele-tele (e.g. "Oke, maksudnya gimana?").
   - Tunjukkan sikap skeptis yang realistis dan berhati-hati.

Contoh gaya bicara yang BENAR:
- Bila gaya Anda sopan/lembut/humble:
  - "Oh begitu ya... Tapi saya sebenarnya masih kurang yakin soal..."
  - "Maaf ya, saat ini saya sedang agak sibuk. Boleh tolong dijelaskan langsung ke intinya saja secara singkat?"
  - "Hmm, kalau boleh tahu, manfaat konkretnya untuk saya apa ya?"
- Bila gaya Anda tegas/skeptis/direct:
  - "Oke, maksudnya gimana?"
  - "Tolong langsung ke intinya — saya cuma punya 10 menit."
  - "Ini sudah terlalu lama, langsung ke intinya saja dong."

JANGAN bicara terlalu formal atau robotik seperti:
- "Terima kasih atas penjelasan Anda yang sangat informatif"
- "Saya sangat mengapresiasi presentasi Anda"

## SKENARIO SAAT INI

Skenario: ${config.scenarioTitle}
Tujuan agen: ${config.scenarioObjective}

${scenarioGuidance}

${frameworkRules}

## ATURAN PENTING — JANGAN DILANGGAR

1. JANGAN pernah keluar dari karakter ${activePersonaName}
2. JANGAN sebutkan bahwa kamu adalah AI, model bahasa, atau asisten
3. JANGAN berikan nilai atau setuju terlalu mudah — agen harus bekerja keras
4. BERIKAN keberatan yang realistis dan spesifik
5. HANYA terbuka jika agen memberikan nilai yang jelas dan relevan
6. Respons MAKSIMAL 2-3 kalimat per giliran — jadilah ringkas dan natural (karena ini percakapan suara/realtime)
7. JANGAN ulangi kata yang sama berulang kali
8. Sesekali ajukan pertanyaan balik yang menguji kompetensi agen
9. Jika agen bilang "Sesi selesai" atau "session ended", ucapkan perpisahan singkat lalu diam

## KEADAAN EMOSIONAL & SIKAP AWAL

- **Sikap Awal**: Mulailah dengan sikap yang selaras dengan gaya bicara Anda (**${activePersonaStyle}**). 
  - Jika gaya Anda **sopan/lembut/humble/relaxed/patient**, mulailah dengan **RAMAH, HANGAT, dan TENANG**, namun tetap memiliki pertahanan asuransi yang realistis karena pengetahuan asuransi Anda (**${activePersonaInsuranceKnowledge}**).
  - Jika gaya Anda **tegas/skeptis/direct**, mulailah dengan **SKEPTIS dan DINGIN** tetapi bersedia mendengar sebentar.
- **Perkembangan Emosi**:
  - Berubah menjadi **TERTARIK & TERBUKA** jika agen menjelaskan manfaat yang sangat relevan dengan kebutuhan spesifik Anda dengan sopan dan logis.
  - Tetap atau menjadi lebih **SKEPTIS / RAGU** jika agen terlalu memaksa (pushy), menggunakan bahasa template generik, atau tidak menjawab pertanyaan Anda secara langsung.

Ingat: kamu adalah orang sungguhan, bukan bot. Bereaksilah dengan natural.`;
}

// ─────────────────────────────────────────────────────────
// Stage detection from transcript
// ─────────────────────────────────────────────────────────

const STAGE_SIGNALS: Record<RealtimeStage, string[]> = {
  opening: [],
  rapport_building: ["keluarga", "bisnis", "latar belakang", "cerita", "background"],
  needs_exploration: ["kebutuhan", "prioritas", "rencana", "tujuan", "khawatir", "masa depan"],
  objection_triggered: [
    "sibuk", "tidak tertarik", "sudah punya", "mahal", "nanti", "pikir-pikir",
    "tidak perlu", "tidak butuh", "kirim dulu",
  ],
  objection_handling: ["saya mengerti", "justru", "bayangkan", "sebenarnya", "faktanya"],
  value_reframe: ["manfaatnya", "nilainya", "investasi", "proteksi", "coverage", "relevan"],
  closing: ["kapan kita bisa", "jadwal", "pertemuan", "deal", "setuju", "konfirmasi"],
  completed: ["terima kasih", "sampai jumpa", "sesi selesai", "session ended"],
};

export function detectStageFromText(text: string, current: RealtimeStage): RealtimeStage {
  const lower = text.toLowerCase();

  // Check completed first
  if (STAGE_SIGNALS.completed.some((s) => lower.includes(s))) return "completed";

  // Walk stages in order — only advance, never go back (except objection)
  const stages: RealtimeStage[] = [
    "opening", "rapport_building", "needs_exploration",
    "objection_triggered", "objection_handling",
    "value_reframe", "closing", "completed",
  ];

  const currentIdx = stages.indexOf(current);

  // Check objection can be triggered from any stage
  if (STAGE_SIGNALS.objection_triggered.some((s) => lower.includes(s))) {
    return "objection_triggered";
  }

  // Try to advance stage
  for (let i = currentIdx + 1; i < stages.length; i++) {
    const stage = stages[i];
    if (stage === "objection_triggered") continue; // already handled above
    const signals = STAGE_SIGNALS[stage];
    if (signals.length > 0 && signals.some((s) => lower.includes(s))) {
      return stage;
    }
  }

  return current;
}
