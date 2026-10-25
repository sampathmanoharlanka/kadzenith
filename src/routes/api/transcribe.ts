import { createFileRoute } from "@tanstack/react-router";

import {
  AI_GATEWAY_URL,
  TRANSCRIBE_MODEL,
  authenticate,
  getGatewayKey,
  jsonError,
} from "@/lib/ai/gateway.server";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

/** Turns a recorded voice question into text. Language is auto-detected. */
export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticate(request);
        if (!auth) return jsonError(401, "Please sign in again");

        const declared = Number(request.headers.get("content-length") ?? 0);
        if (declared > MAX_UPLOAD_BYTES) return jsonError(413, "Recording is too long");

        const form = await request.formData().catch(() => null);
        const file = form?.get("file");
        if (!(file instanceof File) || file.size === 0) return jsonError(400, "No recording received");
        if (file.size > MAX_UPLOAD_BYTES) return jsonError(413, "Recording is too long");
        if (!file.type.startsWith("audio/")) return jsonError(400, "Unsupported recording format");

        const upstreamForm = new FormData();
        upstreamForm.append("model", TRANSCRIBE_MODEL);
        upstreamForm.append("file", file, file.name || "question.wav");
        upstreamForm.append("response_format", "json");
        upstreamForm.append("stream", "true");

        try {
          const upstream = await fetch(`${AI_GATEWAY_URL}/v1/audio/transcriptions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${getGatewayKey()}` },
            body: upstreamForm,
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
