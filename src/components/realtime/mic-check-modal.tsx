/**
 * MicCheckModal — Microphone permission pre-flight check.
 *
 * Shown automatically before every realtime roleplay session starts.
 * Tests mic access, displays device info, and guides the user to fix
 * any permission or hardware issues before the session begins.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n-context";

type MicStatus =
  | "idle"        // not yet tested
  | "requesting"  // waiting for browser permission prompt
  | "granted"     // permission OK, mic working
  | "denied"      // permission denied by user
  | "unavailable" // no mic hardware found
  | "error";      // unknown error

interface MicCheckModalProps {
  /** Called when user confirms mic is ready and wants to proceed */
  onConfirm: () => void;
  /** Called when user cancels / goes back */
  onCancel: () => void;
}

export function MicCheckModal({ onConfirm, onCancel }: MicCheckModalProps) {
  const { lang } = useI18n();
  const [status, setStatus] = useState<MicStatus>("idle");
  const [deviceLabel, setDeviceLabel] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);          // 0–100 live mic level
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const id = lang === "id";

  // ── Clean up audio resources on unmount ──────────────────
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const stopAudio = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
    setVolume(0);
  };

  // ── Request mic and run volume analyser ──────────────────
  const testMic = useCallback(async () => {
    setStatus("requesting");
    setErrorDetail(null);
    stopAudio();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Get device label
      const track = stream.getAudioTracks()[0];
      setDeviceLabel(track?.label || null);

      // Set up analyser for live volume meter
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArr = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(dataArr);
        const avg = dataArr.reduce((a, b) => a + b, 0) / dataArr.length;
        setVolume(Math.min(100, Math.round((avg / 255) * 100 * 2.5)));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();

      setStatus("granted");
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : "Unknown";
      const msg  = err instanceof Error ? err.message : String(err);

      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setStatus("denied");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setStatus("unavailable");
      } else {
        setStatus("error");
        setErrorDetail(msg);
      }
    }
  }, []);

  // Auto-test on mount
  useEffect(() => {
    void testMic();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Confirm: keep stream open, parent will use it ────────
  const handleConfirm = () => {
    // Stop preview stream — the WebRTC client will open its own
    stopAudio();
    onConfirm();
  };

  // ── Status-specific content ───────────────────────────────
  const statusIcon: Record<MicStatus, string> = {
    idle:        "🎙️",
    requesting:  "⏳",
    granted:     "✅",
    denied:      "🚫",
    unavailable: "🔌",
    error:       "⚠️",
  };

  const statusColor: Record<MicStatus, string> = {
    idle:        "text-slate-300",
    requesting:  "text-blue-300",
    granted:     "text-emerald-400",
    denied:      "text-rose-400",
    unavailable: "text-amber-400",
    error:       "text-rose-400",
  };

  const statusTitle: Record<MicStatus, string> = {
    idle:        id ? "Memeriksa Mikrofon..." : "Checking Microphone...",
    requesting:  id ? "Meminta Izin Akses Mikrofon" : "Requesting Microphone Permission",
    granted:     id ? "Mikrofon Siap" : "Microphone Ready",
    denied:      id ? "Akses Mikrofon Ditolak" : "Microphone Access Denied",
    unavailable: id ? "Mikrofon Tidak Ditemukan" : "No Microphone Found",
    error:       id ? "Gagal Mengakses Mikrofon" : "Microphone Access Failed",
  };

  const isReady = status === "granted";
  const isBlocked = status === "denied" || status === "unavailable" || status === "error";

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl overflow-hidden">

        {/* Header */}
        <div className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">🎙️</span>
          <div>
            <p className="text-xs text-blue-300/70 uppercase tracking-widest">
              {id ? "Persiapan Sesi" : "Session Setup"}
            </p>
            <h2 className="text-base font-semibold text-white">
              {id ? "Pemeriksaan Mikrofon" : "Microphone Check"}
            </h2>
          </div>
        </div>

        {/* Status card */}
        <div className="px-6 pt-6 pb-4 space-y-5">
          <div className="rounded-xl border border-white/10 bg-slate-800/60 p-4 flex items-start gap-4">
            <span className="text-3xl flex-shrink-0 mt-0.5">{statusIcon[status]}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold ${statusColor[status]}`}>{statusTitle[status]}</p>
              {status === "requesting" && (
                <p className="mt-1 text-xs text-blue-200/70">
                  {id
                    ? "Browser akan menampilkan popup izin — klik 'Izinkan' untuk melanjutkan."
                    : "Your browser will show a permission popup — click 'Allow' to continue."}
                </p>
              )}
              {status === "granted" && deviceLabel && (
                <p className="mt-1 text-xs text-emerald-300/80 truncate">
                  {id ? "Perangkat: " : "Device: "}<span className="font-mono">{deviceLabel}</span>
                </p>
              )}
              {status === "granted" && !deviceLabel && (
                <p className="mt-1 text-xs text-emerald-300/70">
                  {id ? "Perangkat mikrofon terdeteksi." : "Microphone device detected."}
                </p>
              )}
              {status === "denied" && (
                <p className="mt-1 text-xs text-rose-300/80">
                  {id
                    ? "Izin ditolak. Buka pengaturan browser → Site Settings → Microphone → Izinkan."
                    : "Permission denied. Go to browser Settings → Site Settings → Microphone → Allow."}
                </p>
              )}
              {status === "unavailable" && (
                <p className="mt-1 text-xs text-amber-300/80">
                  {id
                    ? "Tidak ada perangkat mikrofon yang terhubung. Hubungkan headset atau mikrofon eksternal."
                    : "No microphone device found. Connect a headset or external microphone."}
                </p>
              )}
              {status === "error" && errorDetail && (
                <p className="mt-1 text-xs text-rose-300/70 font-mono break-all">{errorDetail}</p>
              )}
            </div>
          </div>

          {/* Live volume meter — only shown when mic is active */}
          {status === "granted" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  {id ? "Level Suara (bicara sekarang untuk test)" : "Audio Level (speak now to test)"}
                </p>
                <span className="text-xs text-slate-500 font-mono">{volume}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-700/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${volume}%`,
                    background:
                      volume > 60
                        ? "linear-gradient(90deg, #10b981, #34d399)"
                        : volume > 20
                        ? "linear-gradient(90deg, #3b82f6, #60a5fa)"
                        : "linear-gradient(90deg, #475569, #64748b)",
                  }}
                />
              </div>
              <p className="text-xs text-slate-500">
                {volume === 0
                  ? (id ? "Tidak ada suara terdeteksi — pastikan mikrofon tidak di-mute." : "No audio detected — make sure your mic is not muted.")
                  : volume < 10
                  ? (id ? "Sinyal lemah — coba dekatkan ke mikrofon." : "Weak signal — try speaking closer to the mic.")
                  : (id ? "Suara terdeteksi dengan baik ✓" : "Audio detected successfully ✓")}
              </p>
            </div>
          )}

          {/* Browser tips — shown when denied */}
          {status === "denied" && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-rose-300">
                {id ? "Cara mengaktifkan izin mikrofon:" : "How to enable microphone permission:"}
              </p>
              <ol className="text-xs text-rose-200/70 space-y-1 list-decimal pl-4">
                <li>{id ? "Klik ikon 🔒 atau ℹ️ di address bar browser" : "Click the 🔒 or ℹ️ icon in the browser address bar"}</li>
                <li>{id ? "Cari 'Mikrofon' dan ubah ke 'Izinkan'" : "Find 'Microphone' and change it to 'Allow'"}</li>
                <li>{id ? "Refresh halaman lalu coba lagi" : "Refresh the page and try again"}</li>
              </ol>
            </div>
          )}

          {/* Info notice */}
          {!isBlocked && (
            <div className="rounded-xl border border-blue-300/15 bg-blue-500/5 p-3 flex items-start gap-2">
              <span className="text-blue-400 text-sm flex-shrink-0">ℹ️</span>
              <p className="text-xs text-blue-200/70 leading-relaxed">
                {id
                  ? "Mikrofon hanya digunakan selama sesi roleplay berlangsung. Akses akan dihentikan otomatis saat sesi berakhir."
                  : "The microphone is only used during the active roleplay session. Access is automatically stopped when the session ends."}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="border-t border-white/10 px-6 py-4 flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium py-2.5 transition-all duration-200"
          >
            {id ? "← Kembali" : "← Back"}
          </button>

          {isBlocked ? (
            <button
              onClick={() => void testMic()}
              className="flex-1 rounded-xl border border-blue-400/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-sm font-semibold py-2.5 transition-all duration-200 flex items-center justify-center gap-2"
            >
              🔄 {id ? "Coba Lagi" : "Retry"}
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={!isReady}
              className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:shadow-[0_0_28px_rgba(59,130,246,0.35)]"
            >
              {status === "requesting" ? (
                <>
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  {id ? "Menunggu izin..." : "Waiting for permission..."}
                </>
              ) : isReady ? (
                <>{id ? "Mulai Roleplay 🎙️" : "Start Roleplay 🎙️"}</>
              ) : (
                <>{id ? "Periksa Mikrofon dulu" : "Check Microphone First"}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
