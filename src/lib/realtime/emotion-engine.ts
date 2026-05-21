/**
 * AJI Emotion Engine — Realtime Emotion Detection
 *
 * Analyzes AI transcript text to infer Tsing Lu's current emotional state.
 * Emotion drives:
 *  - Avatar border color (AvatarRenderer)
 *  - Emotion indicator badge
 *  - TODO: HeyGen expression API call (future sprint)
 */

import { EmotionState } from "@/types/domain";

interface EmotionPattern {
  emotion: EmotionState;
  patterns: string[];
  weight: number;
}

const EMOTION_PATTERNS: EmotionPattern[] = [
  {
    emotion: "frustrated",
    patterns: [
      "tidak", "jangan", "bosen", "lama", "langsung", "singkat", "tidak ada waktu",
      "capek", "sudah cukup", "tolong", "cepat", "nggak",
    ],
    weight: 3,
  },
  {
    emotion: "skeptical",
    patterns: [
      "kurang yakin", "belum yakin", "skeptis", "ragu", "memang bisa", "benarkah",
      "buktinya", "bagaimana mungkin", "terlalu bagus", "biasanya", "janji",
    ],
    weight: 2,
  },
  {
    emotion: "thinking",
    patterns: [
      "hmm", "mm", "oke", "baik", "begitu", "menarik juga", "coba pikir",
      "perlu dipikir", "diskusi dulu", "istri", "partner",
    ],
    weight: 2,
  },
  {
    emotion: "interested",
    patterns: [
      "menarik", "tertarik", "oh iya", "bagus", "masuk akal", "relevan",
      "boleh", "ceritakan", "lebih lanjut", "detail", "spesifik",
    ],
    weight: 2,
  },
  {
    emotion: "open",
    patterns: [
      "setuju", "oke deal", "bisa", "jadwalkan", "saya mau", "siap",
      "lanjut", "konfirmasi", "kapan bisa", "pertemuan",
    ],
    weight: 3,
  },
];

export class EmotionEngine {
  private history: EmotionState[] = [];
  private current: EmotionState = "neutral";

  analyze(text: string): EmotionState {
    const lower = text.toLowerCase();
    const scores: Record<EmotionState, number> = {
      neutral: 0,
      interested: 0,
      skeptical: 0,
      frustrated: 0,
      open: 0,
      thinking: 0,
    };

    for (const { emotion, patterns, weight } of EMOTION_PATTERNS) {
      for (const pattern of patterns) {
        if (lower.includes(pattern)) {
          scores[emotion] += weight;
        }
      }
    }

    const best = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];
    const detected = best[1] > 0 ? (best[0] as EmotionState) : "neutral";

    // Smooth: don't jump emotions too quickly — use rolling window
    this.history.push(detected);
    if (this.history.length > 3) this.history.shift();

    // Take most common emotion in the window
    const freq: Partial<Record<EmotionState, number>> = {};
    for (const e of this.history) {
      freq[e] = (freq[e] ?? 0) + 1;
    }
    const smoothed = Object.entries(freq).sort(([, a], [, b]) => b - a)[0][0] as EmotionState;

    this.current = smoothed;
    return this.current;
  }

  getCurrent(): EmotionState {
    return this.current;
  }

  reset(): void {
    this.history = [];
    this.current = "neutral";
  }
}

// Singleton instance for use in the realtime hook
export const emotionEngine = new EmotionEngine();

// Emotion display config
export const EMOTION_CONFIG: Record<EmotionState, { icon: string; label: string; labelId: string; color: string }> = {
  neutral:    { icon: "😐", label: "Neutral",    labelId: "Netral",      color: "text-slate-400 border-slate-500/40" },
  interested: { icon: "👀", label: "Interested", labelId: "Tertarik",    color: "text-sky-400 border-sky-500/40" },
  skeptical:  { icon: "🤔", label: "Skeptical",  labelId: "Skeptis",     color: "text-amber-400 border-amber-500/40" },
  frustrated: { icon: "😤", label: "Frustrated", labelId: "Frustrasi",   color: "text-rose-400 border-rose-500/40" },
  open:       { icon: "👍", label: "Open",       labelId: "Terbuka",     color: "text-emerald-400 border-emerald-500/40" },
  thinking:   { icon: "💭", label: "Thinking",   labelId: "Berpikir",    color: "text-purple-400 border-purple-500/40" },
};
