function encodeWav(chunks: readonly Float32Array[], sampleRate: number): Blob {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bytes = new ArrayBuffer(44 + length * 2);
  const view = new DataView(bytes);
  const tag = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };

  tag(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, length * 2, true);

  let offset = 44;
  for (const chunk of chunks) {
    for (const value of chunk) {
      const sample = Math.max(-1, Math.min(1, value));
      view.setInt16(offset, sample * (sample < 0 ? 32768 : 32767), true);
      offset += 2;
    }
  }
  return new Blob([bytes], { type: "audio/wav" });
}

interface RecordOptions {
  /** 0–1 loudness, for the animated orb. */
  onLevel?: (level: number) => void;
  /** Fired once the farmer has spoken and then paused. */
  onSilence?: () => void;
  silenceMs?: number;
  maxMs?: number;
}

export interface Recording {
  stop: () => Promise<File>;
  cancel: () => void;
}

const SPEECH_THRESHOLD = 0.025;

/**
 * Records the microphone as a WAV file and detects the end of a sentence,
 * so the conversation flows without tapping a button every time.
 */
export async function startRecording({
  onLevel,
  onSilence,
  silenceMs = 1400,
  maxMs = 30_000,
}: RecordOptions = {}): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });

  const context = new AudioContext();
  await context.resume();
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  const startedAt = performance.now();

  let heardSpeech = false;
  let lastLoudAt = startedAt;
  let silenceReported = false;
  let stopped = false;

  processor.onaudioprocess = (event) => {
    const samples = new Float32Array(event.inputBuffer.getChannelData(0));
    chunks.push(samples);

    let sum = 0;
    for (const sample of samples) sum += sample * sample;
    const rms = Math.sqrt(sum / samples.length);
    onLevel?.(Math.min(1, rms * 8));

    const now = performance.now();
    if (rms > SPEECH_THRESHOLD) {
      heardSpeech = true;
      lastLoudAt = now;
    }

    const paused = heardSpeech && now - lastLoudAt > silenceMs;
    if (!silenceReported && (paused || now - startedAt > maxMs)) {
      silenceReported = true;
      onSilence?.();
    }
  };

  source.connect(processor);
  processor.connect(context.destination);

  const release = async () => {
    stopped = true;
    stream.getTracks().forEach((track) => track.stop());
    processor.onaudioprocess = null;
    processor.disconnect();
    source.disconnect();
    await context.close();
  };

  return {
    async stop() {
      if (stopped) throw new Error("Recording already stopped");
      await release();
      const blob = encodeWav(chunks, context.sampleRate);
      if (!heardSpeech || blob.size < 4096) throw new Error("I didn't hear anything. Please try again.");
      return new File([blob], "question.wav", { type: "audio/wav" });
    },
    cancel() {
      if (!stopped) void release();
    },
  };
}
