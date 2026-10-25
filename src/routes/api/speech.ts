import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  AI_GATEWAY_URL,
  SPEECH_MODEL,
  authenticate,
  getGatewayKey,
  jsonError,
} from "@/lib/ai/gateway.server";

const bodySchema = z.object({ text: z.string().trim().min(1).max(1500) });

/** Turns the assistant's reply into speech (streams 24 kHz PCM over SSE). */
export const Route = createFileRoute("/api/speech")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticate(request);
        if (!auth) return jsonError(401, "Please sign in again");

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return jsonError(400, "Nothing to read out");

        try {
          const upstream = await fetch(`${AI_GATEWAY_URL}/v1/audio/speech`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${getGatewayKey()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: SPEECH_MODEL,
              contents: [{ role: "user", parts: [{ text: parsed.data.text }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
              },
              stream_format: "sse",
            }),
            signal: request.signal,
          });

          return new Response(upstream.body, {
            status: upstream.status,
            headers: {
              "Content-Type": upstream.headers.get("Content-Type") ?? "text/event-stream",
              "Cache-Control": "no-cache",
            },
          });
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return new Response(null, { status: 499 });
          }
          throw error;
        }
      },
    },
  },
});
