/**
 * AJI Bilingual i18n System
 * Supports: English (en) | Bahasa Indonesia (id)
 *
 * Usage:
 *   const { t, lang, setLang } = useI18n();
 *   t('nav.home') → "Home" or "Beranda"
 */

export type Lang = "en" | "id";

export const translations = {
  en: {
    // ── Brand
    "brand.name": "AJI",
    "brand.tagline": "Advance Jovial Interactive",
    "brand.badge": "Interactive AI",

    // ── Navigation
    "nav.home": "Home",
    "nav.dashboard": "Trainee Dashboard",
    "nav.admin": "Admin",
    "nav.scenarios": "Scenarios",
    "nav.roleplay": "Chat Interactive",
    "nav.realtime": "Realtime Roleplay",
    "nav.results": "Results",
    "nav.login": "Login",
    "nav.startTraining": "Start Training",
    "nav.navigation": "Navigation",

    // ── Landing Page
    "landing.eyebrow": "AJI · Advance Jovial Interactive",
    "landing.headline": "AI-powered insurance roleplay training for high-performance agents",
    "landing.subheadline":
      "Practice realistic customer conversations, receive transcript-based scoring, and improve objection handling through structured coaching.",
    "landing.ctaStart": "Start Training",
    "landing.ctaLogin": "Login",
    "landing.heygen": "AI LiveAvatar visual layer ready for full visualization integration.",
    "landing.features.title": "MVP Features",
    "landing.features.1": "Appointment Setting, Fact Finding, Product Pitch scenarios",
    "landing.features.2": "Persona-based roleplay with realistic objections",
    "landing.features.3": "Session transcript + score report (0–100)",
    "landing.features.4": "Category-level coaching insights",
    "landing.features.5": "Admin monitoring dashboard",

    // ── Scenarios
    "scenarios.eyebrow": "Scenario Selection",
    "scenarios.title": "Choose Your Practice Scenario",
    "scenarios.objections": "Common Objections",
    "scenarios.start": "Start",
    "scenarios.difficulty.beginner": "Beginner",
    "scenarios.difficulty.intermediate": "Intermediate",
    "scenarios.difficulty.advanced": "Advanced",

    // ── Roleplay
    "roleplay.initializing": "Initializing session...",
    "roleplay.preparing": "Preparing {scenario} with {persona}.",
    "roleplay.eyebrow": "Live Roleplay",
    "roleplay.panelTitle": "Conversation Panel",
    "roleplay.clientPersona": "Client Persona",
    "roleplay.currentStage": "Current Stage",
    "roleplay.trust": "Trust",
    "roleplay.localMode": "Running in local mode — session not persisted to DB.",
    "roleplay.persisted": "Session persisted · ID:",
    "roleplay.heygenPlaceholder": "Avatar Placeholder: HeyGen LiveAvatar connects here later.",
    "roleplay.timer": "Timer",
    "roleplay.objection": "Objection",
    "roleplay.progress": "Progress",
    "roleplay.objectionPending": "Pending",
    "roleplay.objectionRaised": "Raised",
    "roleplay.objectionAddressed": "Addressed",
    "roleplay.inputPlaceholder": "Type your response as the insurance agent... (Ctrl+Enter to send)",
    "roleplay.endSession": "End Session",
    "roleplay.send": "Send Message",
    "roleplay.sending": "Sending...",

    // ── Debug / Stage Tracker
    "debug.label": "Debug · Admin View",
    "debug.trustLevel": "Trust Level",
    "debug.stagePipeline": "Stage Pipeline",
    "debug.stageJourney": "Stage Journey",
    "debug.objectionsRaised": "Objections Raised",
    "debug.active": "ACTIVE",
    "debug.done": "DONE",
    "debug.pending": "PENDING",

    // ── Stage Labels
    "stage.opening": "Opening",
    "stage.permission_to_continue": "Permission to Continue",
    "stage.needs_exploration": "Needs Exploration",
    "stage.objection_triggered": "Objection Triggered",
    "stage.value_reframe": "Value Reframe",
    "stage.appointment_or_next_step": "Appointment / Next Step",
    "stage.closing": "Closing",
    "stage.completed": "Completed",

    // ── Dashboard
    "dashboard.eyebrow": "Trainee Dashboard",
    "dashboard.title": "Welcome back, Agent",
    "dashboard.sessionsCompleted": "Sessions Completed",
    "dashboard.averageScore": "Average Score",
    "dashboard.currentFocus": "Current Focus",
    "dashboard.objectionHandling": "Objection Handling",
    "dashboard.nextAction": "Recommended Next Action",
    "dashboard.nextActionDesc":
      "Continue with Appointment Setting to strengthen concise value proposition.",
    "dashboard.chooseScenario": "Choose Scenario",

    // ── Admin
    "admin.eyebrow": "Admin Dashboard",
    "admin.title": "Training Oversight",
    "admin.totalTrainees": "Total Trainees",
    "admin.totalSessions": "Total Sessions",
    "admin.avgScore": "Avg Program Score",
    "admin.trainees": "Trainees",
    "admin.recentSessions": "Recent Sessions",
    "admin.sessions": "sessions",
    "admin.avg": "Avg",

    // ── Admin Session Detail
    "adminSession.eyebrow": "Admin · Session Detail",
    "adminSession.notFound":
      "Session not found. Database may not be configured, or the session ID is invalid.",
    "adminSession.scenario": "Scenario",
    "adminSession.persona": "Persona",
    "adminSession.started": "Started",
    "adminSession.trustLevel": "Trust Level",
    "adminSession.stageJourney": "Stage Journey",
    "adminSession.transitions": "transitions recorded",
    "adminSession.objectionHistory": "Objection History",
    "adminSession.noObjections": "No objections were raised in this session.",
    "adminSession.objectionN": "Objection #",
    "adminSession.transcript": "Full Transcript",
    "adminSession.messages": "message(s)",
    "adminSession.noMessages":
      "No messages found. Session may be using local (non-persisted) mode.",

    // ── Results / Score
    "results.eyebrow": "Result and Scoring",
    "results.title": "Session Report:",
    "results.generating": "Generating score report...",
    "results.generatingDesc":
      "Evaluating transcript against communication, empathy, discovery, objection handling, and closing quality.",
    "results.loading": "Loading session results...",
    "results.loadingDesc": "Preparing transcript and scoring context.",
    "results.overallScore": "Overall Score",
    "results.strengths": "Strengths",
    "results.improvements": "Areas to Improve",
    "results.betterResponse": "Suggested Better Response",
    "results.nextPractice": "Next Recommended Practice",
    "results.mode": "Mode",

    // ── Login
    "login.eyebrow": "Welcome back",
    "login.title": "Login to AJI",
    "login.email": "Email",
    "login.password": "Password",
    "login.demo": "Demo Sign-in",
    "login.placeholder": "Use your agent credentials to sign in to the training system.",
    "login.submit": "Login",

    // ── Language Switcher
    "lang.en": "EN",
    "lang.id": "ID",
    "lang.switchTo": "Switch language",
  },

  id: {
    // ── Brand
    "brand.name": "AJI",
    "brand.tagline": "Advance Jovial Interactive",
    "brand.badge": "AI Interaktif",

    // ── Navigation
    "nav.home": "Beranda",
    "nav.dashboard": "Dashboard Trainee",
    "nav.admin": "Admin",
    "nav.scenarios": "Skenario",
    "nav.roleplay": "Chat Interaktif",
    "nav.realtime": "Realtime Roleplay",
    "nav.results": "Hasil",
    "nav.login": "Masuk",
    "nav.startTraining": "Mulai Latihan",
    "nav.navigation": "Navigasi",

    // ── Landing Page
    "landing.eyebrow": "AJI · Advance Jovial Interactive",
    "landing.headline":
      "Platform latihan roleplay asuransi berbasis AI untuk agen berprestasi tinggi",
    "landing.subheadline":
      "Praktikkan percakapan pelanggan yang realistis, terima skor berbasis transkrip, dan tingkatkan penanganan keberatan melalui coaching terstruktur.",
    "landing.ctaStart": "Mulai Latihan",
    "landing.ctaLogin": "Masuk",
    "landing.heygen": "Lapisan visual AI LiveAvatar siap diintegrasikan untuk visualisasi penuh.",
    "landing.features.title": "Fitur MVP",
    "landing.features.1": "Skenario Appointment Setting, Fact Finding, Product Pitch",
    "landing.features.2": "Roleplay berbasis persona dengan keberatan yang realistis",
    "landing.features.3": "Transkrip sesi + laporan skor (0–100)",
    "landing.features.4": "Insight coaching per kategori",
    "landing.features.5": "Dashboard monitoring admin",

    // ── Scenarios
    "scenarios.eyebrow": "Pilihan Skenario",
    "scenarios.title": "Pilih Skenario Latihan Anda",
    "scenarios.objections": "Keberatan Umum",
    "scenarios.start": "Mulai",
    "scenarios.difficulty.beginner": "Pemula",
    "scenarios.difficulty.intermediate": "Menengah",
    "scenarios.difficulty.advanced": "Mahir",

    // ── Roleplay
    "roleplay.initializing": "Menginisialisasi sesi...",
    "roleplay.preparing": "Mempersiapkan {scenario} dengan {persona}.",
    "roleplay.eyebrow": "Roleplay Langsung",
    "roleplay.panelTitle": "Panel Percakapan",
    "roleplay.clientPersona": "Persona Klien",
    "roleplay.currentStage": "Tahap Saat Ini",
    "roleplay.trust": "Kepercayaan",
    "roleplay.localMode": "Berjalan dalam mode lokal — sesi tidak disimpan ke database.",
    "roleplay.persisted": "Sesi tersimpan · ID:",
    "roleplay.heygenPlaceholder": "Placeholder Avatar: HeyGen LiveAvatar akan terhubung di sini.",
    "roleplay.timer": "Waktu",
    "roleplay.objection": "Keberatan",
    "roleplay.progress": "Progres",
    "roleplay.objectionPending": "Menunggu",
    "roleplay.objectionRaised": "Dimunculkan",
    "roleplay.objectionAddressed": "Ditangani",
    "roleplay.inputPlaceholder":
      "Ketik respons Anda sebagai agen asuransi... (Ctrl+Enter untuk kirim)",
    "roleplay.endSession": "Akhiri Sesi",
    "roleplay.send": "Kirim Pesan",
    "roleplay.sending": "Mengirim...",

    // ── Debug / Stage Tracker
    "debug.label": "Debug · Tampilan Admin",
    "debug.trustLevel": "Level Kepercayaan",
    "debug.stagePipeline": "Alur Tahap",
    "debug.stageJourney": "Perjalanan Tahap",
    "debug.objectionsRaised": "Keberatan yang Dimunculkan",
    "debug.active": "AKTIF",
    "debug.done": "SELESAI",
    "debug.pending": "MENUNGGU",

    // ── Stage Labels
    "stage.opening": "Pembukaan",
    "stage.permission_to_continue": "Izin Melanjutkan",
    "stage.needs_exploration": "Eksplorasi Kebutuhan",
    "stage.objection_triggered": "Keberatan Dimunculkan",
    "stage.value_reframe": "Reframing Nilai",
    "stage.appointment_or_next_step": "Janji / Langkah Selanjutnya",
    "stage.closing": "Penutupan",
    "stage.completed": "Selesai",

    // ── Dashboard
    "dashboard.eyebrow": "Dashboard Trainee",
    "dashboard.title": "Selamat datang kembali, Agen",
    "dashboard.sessionsCompleted": "Sesi Selesai",
    "dashboard.averageScore": "Rata-rata Skor",
    "dashboard.currentFocus": "Fokus Saat Ini",
    "dashboard.objectionHandling": "Penanganan Keberatan",
    "dashboard.nextAction": "Rekomendasi Tindakan Selanjutnya",
    "dashboard.nextActionDesc":
      "Lanjutkan dengan Appointment Setting untuk memperkuat proposisi nilai yang ringkas.",
    "dashboard.chooseScenario": "Pilih Skenario",

    // ── Admin
    "admin.eyebrow": "Dashboard Admin",
    "admin.title": "Pengawasan Pelatihan",
    "admin.totalTrainees": "Total Trainee",
    "admin.totalSessions": "Total Sesi",
    "admin.avgScore": "Rata-rata Skor Program",
    "admin.trainees": "Trainee",
    "admin.recentSessions": "Sesi Terbaru",
    "admin.sessions": "sesi",
    "admin.avg": "Rata-rata",

    // ── Admin Session Detail
    "adminSession.eyebrow": "Admin · Detail Sesi",
    "adminSession.notFound":
      "Sesi tidak ditemukan. Database mungkin belum dikonfigurasi, atau ID sesi tidak valid.",
    "adminSession.scenario": "Skenario",
    "adminSession.persona": "Persona",
    "adminSession.started": "Dimulai",
    "adminSession.trustLevel": "Level Kepercayaan",
    "adminSession.stageJourney": "Perjalanan Tahap",
    "adminSession.transitions": "transisi tercatat",
    "adminSession.objectionHistory": "Riwayat Keberatan",
    "adminSession.noObjections": "Tidak ada keberatan yang dimunculkan dalam sesi ini.",
    "adminSession.objectionN": "Keberatan #",
    "adminSession.transcript": "Transkrip Lengkap",
    "adminSession.messages": "pesan",
    "adminSession.noMessages":
      "Tidak ada pesan ditemukan. Sesi mungkin menggunakan mode lokal (tidak tersimpan).",

    // ── Results / Score
    "results.eyebrow": "Hasil dan Penilaian",
    "results.title": "Laporan Sesi:",
    "results.generating": "Membuat laporan skor...",
    "results.generatingDesc":
      "Mengevaluasi transkrip berdasarkan komunikasi, empati, penemuan kebutuhan, penanganan keberatan, dan kualitas penutupan.",
    "results.loading": "Memuat hasil sesi...",
    "results.loadingDesc": "Mempersiapkan transkrip dan konteks penilaian.",
    "results.overallScore": "Skor Keseluruhan",
    "results.strengths": "Kekuatan",
    "results.improvements": "Area untuk Ditingkatkan",
    "results.betterResponse": "Saran Respons yang Lebih Baik",
    "results.nextPractice": "Latihan Selanjutnya yang Direkomendasikan",
    "results.mode": "Mode",

    // ── Login
    "login.eyebrow": "Selamat datang kembali",
    "login.title": "Masuk ke AJI",
    "login.email": "Email",
    "login.password": "Kata Sandi",
    "login.demo": "Masuk Demo",
    "login.placeholder":
      "Gunakan kredensial agen Anda untuk masuk ke sistem latihan.",
    "login.submit": "Masuk",

    // ── Language Switcher
    "lang.en": "EN",
    "lang.id": "ID",
    "lang.switchTo": "Ganti bahasa",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
