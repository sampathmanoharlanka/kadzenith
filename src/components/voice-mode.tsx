import { Mic, PhoneOff } from "lucide-react";

import mitra from "@/assets/mitra.png";
import type { VoiceState } from "@/hooks/use-voice-conversation";
import { cn } from "@/lib/utils";

const STATE_TEXT: Record<VoiceState, { en: string; te: string }> = {
  idle: { en: "Starting…", te: "" },
  listening: { en: "Listening…", te: "వింటున్నాను" },
  transcribing: { en: "Got it…", te: "అర్థమైంది" },
  thinking: { en: "Thinking…", te: "ఆలోచిస్తున్నాను" },
  speaking: { en: "Speaking · tap to interrupt", te: "మాట్లాడుతున్నాను" },
};

interface VoiceModeProps {
  state: VoiceState;
  level: number;
  heard: string;
  caption: string;
  onTap: () => void;
  onClose: () => void;
}

/** Full-screen live conversation, inspired by Gemini Live but in KAD white. */
export function VoiceMode({ state, level, heard, caption, onTap, onClose }: VoiceModeProps) {
  const text = STATE_TEXT[state];
  const scale = state === "listening" ? 1 + level * 0.35 : 1;

  return (
    <div
      role="dialog"
      aria-label="Talk to KAD Mitra"
      className="fixed inset-0 z-50 mx-auto flex max-w-[30rem] flex-col bg-background px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-safe animate-in fade-in"
    >
      <div className="flex items-center gap-2">
        <img src={mitra} alt="" width={28} height={28} className="size-7" />
        <span className="font-display font-bold">KAD Mitra</span>
        <span className="rounded-full bg-saffron-soft px-2 py-0.5 text-[11px] font-bold text-saffron">LIVE</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Speak in Telugu, Hindi or English — I'll reply the same way.</p>

      <button
        type="button"
        onClick={onTap}
        aria-label={state === "speaking" ? "Interrupt" : "Send now"}
        className="relative mx-auto mt-auto grid size-64 place-items-center"
      >
        <span
          className={cn(
            "absolute inset-6 bg-gradient-ai opacity-30 blur-2xl transition-transform duration-150",
            state !== "listening" && "animate-kad-orb",
          )}
          style={{ transform: `scale(${scale * 1.1})` }}
        />
        <span
          className={cn(
            "absolute inset-10 bg-gradient-ai shadow-lift transition-transform duration-100",
            "animate-kad-orb",
            state === "thinking" && "[animation-duration:1.6s]",
            state === "transcribing" && "opacity-80",
          )}
          style={{ scale: String(scale) }}
        />
        <img src={mitra} alt="" width={96} height={96} className="relative size-24 drop-shadow-lg" />
      </button>

      <div className="mt-8 min-h-28 text-center">
        <p className="font-display text-lg font-semibold">{text.en}</p>
        {text.te && <p className="text-sm text-muted-foreground">{text.te}</p>}
        {heard && state !== "listening" && (
          <p className="mx-auto mt-4 line-clamp-2 max-w-xs text-sm text-muted-foreground">“{heard}”</p>
        )}
        {caption && state === "speaking" && (
          <p className="mx-auto mt-3 line-clamp-4 max-w-sm text-base">{caption}</p>
        )}
      </div>

      <div className="mt-auto mb-6 flex items-center justify-center gap-6">
        <span
          className={cn(
            "grid size-16 place-items-center rounded-full",
            state === "listening" ? "bg-leaf-soft text-primary" : "bg-muted text-muted-foreground",
          )}
          aria-hidden="true"
        >
          <Mic className="size-6" />
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="End conversation"
          className="grid size-16 place-items-center rounded-full bg-destructive text-destructive-foreground transition-transform active:scale-95"
        >
          <PhoneOff className="size-6" />
        </button>
      </div>
    </div>
  );
}
