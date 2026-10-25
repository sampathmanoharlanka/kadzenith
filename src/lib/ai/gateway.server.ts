import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev";
export const CHAT_MODEL = "openai/gpt-6-astra";
export const SPEECH_MODEL = "google/gemini-3.1-flash-tts-preview";
export const TRANSCRIBE_MODEL = "openai/gpt-transcribe";

export function getGatewayKey() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  return key;
}

export function jsonError(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

/**
 * Checks the caller's bearer token and returns a database client that acts
 * as that user, so row level security still applies.
 */
export async function authenticate(request: Request) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !key || !token || token.split(".").length !== 3) return null;

  const supabase = createClient<Database>(url, key, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims.sub) return null;

  return { supabase, userId: data.claims.sub };
}
