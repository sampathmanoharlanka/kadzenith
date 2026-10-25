import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { z } from "zod";

import { buildInstructions, loadFarmerContext } from "@/lib/ai/farm-assistant.server";
import {
  AI_GATEWAY_URL,
  CHAT_MODEL,
  authenticate,
  getGatewayKey,
  jsonError,
} from "@/lib/ai/gateway.server";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai/run-id.server";

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1).max(60),
  mode: z.enum(["text", "voice"]).default("text"),
});

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticate(request);
        if (!auth) return jsonError(401, "Please sign in again");

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return jsonError(400, "Invalid chat request");

        const messages = parsed.data.messages as UIMessage[];
        const context = await loadFarmerContext(auth.supabase, auth.userId);
        const apiKey = getGatewayKey();

        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const provider = createOpenAI({
          baseURL: `${AI_GATEWAY_URL}/v1`,
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });

        const result = streamText({
          model: provider.responses(CHAT_MODEL),
          instructions: buildInstructions(context, parsed.data.mode),
          messages: await convertToModelMessages(messages),
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              store: false,
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({
            originalMessages: messages,
            sendReasoning: true,
            onError: (error) => {
              console.error("KAD Mitra chat failed", error);
              const status = (error as { statusCode?: number })?.statusCode;
              if (status === 429) return "Too many questions right now. Please wait a moment.";
              if (status === 402) return "AI credits have run out. Please ask the admin to add more.";
              return "Sorry, I couldn't answer that. Please try again.";
            },
          }),
          runIdFetch,
        );
      },
    },
  },
});
