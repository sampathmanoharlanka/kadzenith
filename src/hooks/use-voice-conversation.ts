import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { startRecording, type Recording } from "@/lib/voice/recorder";
import { speak, transcribe } from "@/lib/voice/voice-api";

export type VoiceState = "idle" | "listening" | "transcribing" | "thinking" | "speaking";

/**
 * Hands-free conversation loop, like Gemini Live:
 * listen → (pause detected) → transcribe → ask → speak the answer → listen again.
 */
export function useVoiceConversation({ ask }: { ask: (text: string) => void }) {
  const [active, setActive] = useState(false);
  const [state, setState] = useState<VoiceState>("idle");
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState("");

  const activeRef = useRef(false);
  const recordingRef = useRef<Recording | null>(null);
  const speechRef = useRef<AbortController | null>(null);
  const askRef = useRef(ask);
  askRef.current = ask;

  const finishTurnRef = useRef<() => Promise<void>>(async () => {});

  const stop = useCallback(() => {
    activeRef.current = false;
    recordingRef.current?.cancel();
    recordingRef.current = null;
    speechRef.current?.abort();
    speechRef.current = null;
    setActive(false);
    setState("idle");
    setLevel(0);
  }, []);

  const listen = useCallback(async () => {
    if (!activeRef.current) return;
    setState("listening");
    setLevel(0);
    try {
      recordingRef.current = await startRecording({
        onLevel: setLevel,
        onSilence: () => void finishTurnRef.current(),
      });
      // The farmer may have closed voice mode while the mic was starting.
      if (!activeRef.current) recordingRef.current.cancel();
    } catch {
      toast.error("Please allow microphone access to talk to KAD Mitra");
      stop();
    }
  }, [stop]);

  finishTurnRef.current = async () => {
    const recording = recordingRef.current;
    if (!recording) return;
    recordingRef.current = null;
    setState("transcribing");
    setLevel(0);

    try {
      const text = await transcribe(await recording.stop());
      if (!activeRef.current) return;
      if (!text) {
        toast("I didn't catch that. Please say it again.");
        return void listen();
      }
      setHeard(text);
      setState("thinking");
      askRef.current(text);
    } catch (error) {
      if (!activeRef.current) return;
      toast(error instanceof Error ? error.message : "Something went wrong");
      void listen();
    }
  };

  /** Call when the assistant has finished writing its answer. */
  const answer = useCallback(
    async (text: string) => {
      if (!activeRef.current) return;
      setState("speaking");
      const controller = new AbortController();
      speechRef.current = controller;
      try {
        await speak(text, controller.signal);
      } catch {
        if (!controller.signal.aborted) toast.error("Couldn't play the answer");
      }
      if (activeRef.current && !controller.signal.aborted) void listen();
    },
    [listen],
  );

  /** Tap on the orb: send now while listening, or interrupt while speaking. */
  const tap = useCallback(() => {
    if (state === "listening") void finishTurnRef.current();
    if (state === "speaking") {
      speechRef.current?.abort();
      void listen();
    }
  }, [state, listen]);

  const start = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    setActive(true);
    setHeard("");
    void listen();
  }, [listen]);

  /** If the chat request fails, go back to listening instead of getting stuck. */
  const recover = useCallback(() => {
    if (activeRef.current) void listen();
  }, [listen]);

  useEffect(() => stop, [stop]);

  return { active, state, level, heard, start, stop, tap, answer, recover, isActive: () => activeRef.current };
}
