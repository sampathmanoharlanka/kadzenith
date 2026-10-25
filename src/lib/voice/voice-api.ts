import { createParser } from "eventsource-parser";

import { getAccessToken } from "@/lib/auth";
import { splitForSpeech, toSpeakableText } from "./speakable";

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readError(response: Response) {
  const body = await response.json().catch(() => null);
  return (body as { error?: string } | null)?.error ?? `Request failed (${response.status})`;
}

/** Uploads a recording and returns the final transcript. */
export async function transcribe(file: File, signal?: AbortSignal) {
  const form = new FormData();
  form.append("file", file, file.name);

  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: await authHeaders(),
    body: form,
    signal,
  });
  if (!response.ok || !response.body) throw new Error(await readError(response));

  let text = "";
  let finalText: string | null = null;
  let failure: string | null = null;

  const parser = createParser({
    onEvent(event) {
      const payload = JSON.parse(event.data) as {
        type?: string;
        delta?: string;
        text?: string;
        error?: { message?: string } | string;
      };
      if (payload.error) {
        failure = typeof payload.error === "string" ? payload.error : (payload.error.message ?? "Transcription failed");
      } else if (payload.type === "transcript.text.delta" && payload.delta) {
        text += payload.delta;
      } else if (payload.type === "transcript.text.done") {
        finalText = payload.text ?? text;
      }
    },
  });

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.feed(value);
  }

  if (failure) throw new Error(failure);
  return (finalText ?? text).trim();
}

function decodePcm(pending: Uint8Array, incoming: Uint8Array) {
  const bytes = new Uint8Array(pending.length + incoming.length);
  bytes.set(pending);
  bytes.set(incoming, pending.length);
  const usable = bytes.length - (bytes.length % 2);
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(usable / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
  return { samples, pending: bytes.slice(usable) };
}

const SAMPLE_RATE = 24_000;

/** Streams one chunk of speech and plays it as the audio arrives. */
async function playChunk(text: string, context: AudioContext, signal: AbortSignal) {
  const sources = new Set<AudioBufferSourceNode>();
  const stopAll = () => sources.forEach((source) => source.stop());
  signal.addEventListener("abort", stopAll, { once: true });

  let playhead = 0;
  let pending = new Uint8Array(0);
  let completed = false;
  let lastSource: Promise<void> = Promise.resolve();

  try {
    const response = await fetch("/api/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ text }),
      signal,
    });
    if (!response.ok || !response.body) throw new Error(await readError(response));

    const parser = createParser({
      onEvent(event) {
        const payload = JSON.parse(event.data) as { type: string; audio?: string; error?: unknown };
        if (payload.type === "error" || payload.error) throw new Error("Speech failed");
        if (payload.type === "speech.audio.done") {
          completed = true;
          return;
        }
        if (payload.type !== "speech.audio.delta" || !payload.audio) return;

        const decoded = decodePcm(
          pending,
          Uint8Array.from(atob(payload.audio), (c) => c.charCodeAt(0)),
        );
        pending = new Uint8Array(decoded.pending);
        if (!decoded.samples.length) return;

        const buffer = context.createBuffer(1, decoded.samples.length, SAMPLE_RATE);
        buffer.copyToChannel(decoded.samples, 0);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        sources.add(source);
        lastSource = new Promise((resolve) => {
          source.onended = () => {
            sources.delete(source);
            resolve();
          };
        });
        playhead = Math.max(playhead, context.currentTime + 0.05);
        source.start(playhead);
        playhead += buffer.duration;
      },
    });

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.feed(value);
    }
    if (!completed) throw new Error("Speech was cut off");
    await lastSource;
  } finally {
    signal.removeEventListener("abort", stopAll);
  }
}

/** Reads an assistant reply aloud in whatever language it was written in. */
export async function speak(markdown: string, signal: AbortSignal) {
  const chunks = splitForSpeech(toSpeakableText(markdown));
  if (!chunks.length) return;

  const context = new AudioContext({ sampleRate: SAMPLE_RATE });
  try {
    if (context.state === "suspended") await context.resume();
    for (const chunk of chunks) {
      if (signal.aborted) return;
      await playChunk(chunk, context, signal);
    }
  } finally {
    await context.close();
  }
}
