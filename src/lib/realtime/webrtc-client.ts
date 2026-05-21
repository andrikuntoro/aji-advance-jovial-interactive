/**
 * AJI WebRTC Realtime Client
 *
 * Manages the WebRTC connection to OpenAI Realtime API (GA).
 * Uses RTCPeerConnection for low-latency audio streaming.
 *
 * Architecture:
 *  - RTCPeerConnection carries audio (mic in, AI voice out)
 *  - DataChannel carries JSON events (transcripts, function calls)
 *  - All state updates are pushed to the Zustand realtime store
 *
 * Audio playback fix notes:
 *  - The AI audio element MUST be appended to document.body (hidden).
 *    Off-DOM audio elements are suspended/GC'd by browsers after ~5s.
 *  - We send `response.cancel` via data channel if VAD accidentally
 *    triggers during AI speech (interrupt guard).
 *
 * TODO: HeyGen Integration Points are marked with TODO:HeyGen comments.
 */

import { EmotionState, RealtimeStage } from "@/types/domain";
import { detectStageFromText } from "./session-orchestrator";
import { emotionEngine } from "./emotion-engine";

// ─────────────────────────────────────────────────────────
// Event callbacks — implemented by the Zustand store hook
// ─────────────────────────────────────────────────────────

export interface RealtimeClientCallbacks {
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (message: string) => void;
  onTranscriptDelta: (role: "trainee" | "ai_client", delta: string, itemId: string) => void;
  onTranscriptDone: (role: "trainee" | "ai_client", text: string, itemId: string) => void;
  onSpeechStarted: (role: "trainee" | "ai_client") => void;
  onSpeechStopped: (role: "trainee" | "ai_client") => void;
  onEmotionDetected: (emotion: EmotionState) => void;
  onStageAdvanced: (stage: RealtimeStage) => void;
}

// ─────────────────────────────────────────────────────────
// RealtimeClient class
// ─────────────────────────────────────────────────────────

export class RealtimeClient {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;

  /**
   * The <audio> element that plays the AI voice stream.
   *
   * IMPORTANT: This element is appended to document.body (with display:none)
   * for the entire duration of the session. Browsers (Chrome, Safari) apply
   * Media Session management and may suspend or garbage-collect audio elements
   * that are NOT in the DOM after approximately 5 seconds. Keeping it in the
   * DOM prevents the audio cutoff bug.
   */
  private audioEl: HTMLAudioElement | null = null;

  private localStream: MediaStream | null = null;
  private callbacks: RealtimeClientCallbacks;
  private currentStage: RealtimeStage = "opening";

  /** True while the AI is streaming audio — used to guard against accidental VAD interrupts */
  private isAiSpeaking = false;

  // Partial transcript buffers (indexed by item_id)
  private partialAI: Record<string, string> = {};
  private partialUser: Record<string, string> = {};

  constructor(callbacks: RealtimeClientCallbacks) {
    this.callbacks = callbacks;
  }

  // ── Public API ────────────────────────────────────────

  async connect(ephemeralToken: string, model = "gpt-realtime-2"): Promise<void> {
    try {
      // 1. Request microphone access
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 2. Create peer connection
      this.pc = new RTCPeerConnection();

      // 3. Set up audio output element for AI voice
      //    ─── CRITICAL: Must be appended to document.body ───────────
      //    Off-DOM audio elements are suspended by browsers after ~5s
      //    (Chrome Media Session policy, Safari power management).
      //    The element is hidden visually but kept alive in the DOM.
      this.audioEl = document.createElement("audio");
      this.audioEl.autoplay = true;
      this.audioEl.style.display = "none";
      this.audioEl.setAttribute("playsinline", "true");   // iOS Safari
      this.audioEl.setAttribute("webkit-playsinline", "true"); // older iOS
      document.body.appendChild(this.audioEl);

      // TODO:HeyGen — mirror this audio stream to HeyGen LiveAvatar voice input
      this.pc.ontrack = (e) => {
        if (this.audioEl && e.streams[0]) {
          this.audioEl.srcObject = e.streams[0];

          // Resume playback if browser auto-paused (e.g. tab switch)
          const playPromise = this.audioEl.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              // Ignore — autoplay policies may block this, but WebRTC
              // audio via RTCPeerConnection is typically exempt.
            });
          }
        }
      };

      // 4. Add microphone track
      const [audioTrack] = this.localStream.getAudioTracks();
      this.pc.addTrack(audioTrack, this.localStream);

      // 5. Create data channel for events
      this.dc = this.pc.createDataChannel("oai-events");
      this.dc.addEventListener("message", (e) => this.handleDataChannelMessage(e));
      this.dc.addEventListener("open", () => this.callbacks.onConnected());
      this.dc.addEventListener("close", () => this.callbacks.onDisconnected());

      // 6. ICE connection monitoring — log drops for debugging
      this.pc.addEventListener("iceconnectionstatechange", () => {
        const state = this.pc?.iceConnectionState;
        if (state === "failed" || state === "disconnected") {
          console.warn("[WebRTC] ICE connection state:", state);
          this.callbacks.onError(`WebRTC ICE ${state} — check network stability.`);
        }
      });

      // 7. Create offer + SDP exchange with OpenAI (GA endpoint)
      //    model must be specified as a query param on /v1/realtime/calls
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      const sdpResponse = await fetch(
        `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`,
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${ephemeralToken}`,
            "Content-Type": "application/sdp",
          },
        }
      );

      if (!sdpResponse.ok) {
        const errBody = await sdpResponse.text();
        throw new Error(`SDP exchange failed: ${sdpResponse.status} — ${errBody}`);
      }

      const answerSdp = await sdpResponse.text();
      await this.pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err) {
      console.error("RealtimeClient.connect error:", err);
      this.callbacks.onError(
        err instanceof Error ? err.message : "Failed to connect to OpenAI Realtime API"
      );
      this.cleanup();
    }
  }

  disconnect(): void {
    this.cleanup();
    this.callbacks.onDisconnected();
  }

  mute(): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => (t.enabled = false));
    }
  }

  unmute(): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => (t.enabled = true));
    }
  }

  sendEvent(event: Record<string, unknown>): void {
    if (this.dc?.readyState === "open") {
      this.dc.send(JSON.stringify(event));
    }
  }

  // ── DataChannel event handler ─────────────────────────

  private handleDataChannelMessage(e: MessageEvent): void {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(e.data as string) as Record<string, unknown>;
    } catch {
      return;
    }

    const type = event.type as string;

    switch (type) {
      // ── User speech detection ─────────────────────────
      case "input_audio_buffer.speech_started":
        // If AI is still speaking, this is likely a false VAD trigger from
        // ambient noise / echo. We guard here to avoid interrupting mid-sentence.
        if (!this.isAiSpeaking) {
          this.callbacks.onSpeechStarted("trainee");
        }
        // Note: We do NOT call response.cancel here even if isAiSpeaking,
        // because interrupt_response is handled server-side. The server default
        // (interrupt_response: true) already manages this; we only skip the
        // client-side UI callback to avoid flicker.
        break;

      case "input_audio_buffer.speech_stopped":
        this.callbacks.onSpeechStopped("trainee");
        break;

      // ── User transcript (from Whisper) ────────────────
      case "conversation.item.input_audio_transcription.completed": {
        const itemId = event.item_id as string;
        const text = (event.transcript as string) ?? "";
        this.partialUser[itemId] = (this.partialUser[itemId] ?? "") + text;
        this.callbacks.onTranscriptDone("trainee", this.partialUser[itemId], itemId);
        // Advance stage based on trainee message
        const nextStage = detectStageFromText(text, this.currentStage);
        if (nextStage !== this.currentStage) {
          this.currentStage = nextStage;
          this.callbacks.onStageAdvanced(nextStage);
        }
        break;
      }

      // ── AI response audio ─────────────────────────────
      // GA API: response.audio.started/done don't exist.
      // Use output_audio_started/stopped (newer GA) or response.created/done.
      case "response.output_audio_started":
      case "response.audio.started":          // kept for compat
        this.isAiSpeaking = true;
        this.callbacks.onSpeechStarted("ai_client");
        break;

      case "response.output_audio_stopped":
      case "response.audio.done":             // kept for compat
        this.isAiSpeaking = false;
        this.callbacks.onSpeechStopped("ai_client");
        break;

      // Handle response cancelled (e.g. VAD interrupt) — reset flag
      case "response.canceled":   // GA spelling
      case "response.cancelled":  // compat
      case "response.done":
        this.isAiSpeaking = false;
        break;

      // ── AI transcript streaming (delta) ───────────────
      case "response.audio_transcript.delta": {
        const itemId = event.item_id as string;
        const delta = (event.delta as string) ?? "";
        this.partialAI[itemId] = (this.partialAI[itemId] ?? "") + delta;
        this.callbacks.onTranscriptDelta("ai_client", delta, itemId);
        break;
      }

      // ── AI transcript final ───────────────────────────
      case "response.audio_transcript.done": {
        const itemId = event.item_id as string;
        const fullText = (event.transcript as string) ?? this.partialAI[itemId] ?? "";
        this.partialAI[itemId] = fullText;
        this.callbacks.onTranscriptDone("ai_client", fullText, itemId);

        // Emotion detection from AI response
        const emotion = emotionEngine.analyze(fullText);
        this.callbacks.onEmotionDetected(emotion);

        // TODO:HeyGen — send emotion to HeyGen expression API:
        // heygenClient.setExpression(emotionToHeyGenExpression(emotion));

        // Stage detection from AI response too
        const nextStage = detectStageFromText(fullText, this.currentStage);
        if (nextStage !== this.currentStage) {
          this.currentStage = nextStage;
          this.callbacks.onStageAdvanced(nextStage);
        }
        break;
      }

      case "error": {
        const errObj = event.error as Record<string, unknown>;
        const errMsg = (event.message as string) ?? errObj?.message as string ?? "Unknown realtime error";
        
        // Ignore "conversation_already_has_active_response" because we explicitly set
        // interrupt_response: false in route.ts to prevent mic noise from cutting off the AI.
        // If VAD triggers from noise, the server tries to respond but fails safely.
        if (errObj?.code === "conversation_already_has_active_response") {
          console.warn("[WebRTC] Ignored expected error (AI was speaking):", errMsg);
          break;
        }

        // Log every field of the error event so we can diagnose the root cause
        console.error("OpenAI Realtime error event — full payload:", JSON.stringify(event, null, 2));
        this.callbacks.onError(errMsg);
        break;
      }

      default:
        // Log every unhandled event type so we can detect API shape changes
        console.debug("[WebRTC] unhandled event:", type, event);
        break;
    }
  }

  // ── Cleanup ───────────────────────────────────────────

  private cleanup(): void {
    this.isAiSpeaking = false;
    this.dc?.close();
    this.pc?.close();
    this.localStream?.getTracks().forEach((t) => t.stop());

    // Remove audio element from DOM to release resources
    if (this.audioEl) {
      this.audioEl.srcObject = null;
      this.audioEl.pause();
      if (this.audioEl.parentNode) {
        this.audioEl.parentNode.removeChild(this.audioEl);
      }
    }

    this.dc = null;
    this.pc = null;
    this.localStream = null;
    this.audioEl = null;
    this.partialAI = {};
    this.partialUser = {};
    emotionEngine.reset();
  }
}
