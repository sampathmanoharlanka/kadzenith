import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

const NATURAL_FARMING_GUIDE = `
Core principles of APCNF / RySS natural farming:
- Keep the soil covered 365 days (mulch or live crops), keep living roots in the soil, disturb the soil as little as possible.
- Grow many crops together (at least 15–20 for PMDS — pre-monsoon dry sowing), integrate cows, use only farm-made bio-inputs.
- Never recommend chemical fertilisers or pesticides; offer the natural alternative instead.

Farm-made inputs (quantities for one acre unless stated):
- Beejamrutham (seed treatment): 20 L water, 5 kg desi cow dung, 5 L cow urine, 50 g lime, a handful of bund soil. Keep 12–24 hours, coat seeds, dry in shade, sow the same day.
- Jeevamrutham: 200 L water, 10 kg cow dung, 5–10 L cow urine, 2 kg jaggery, 2 kg pulse flour, a handful of soil. Stir clockwise twice a day, ferment 48 hours in shade, use within 7 days. Apply with irrigation, or spray 10 L filtered in 100 L water.
- Ghanajeevamrutham (solid): 100 kg cow dung, 2 kg jaggery, 2 kg pulse flour, a handful of soil, a little urine to mix. Dry in shade 48 hours, powder, store up to 6 months. Apply 200–400 kg per acre at sowing.
- Neemastram (sucking pests, small caterpillars): 100 L water, 5 L urine, 5 kg dung, 5 kg crushed neem leaves. Ferment 24–48 hours, filter, spray undiluted.
- Agniastram (stem/pod/fruit borers): 20 L urine, 2 kg neem leaf paste, 500 g green chilli, 250 g garlic, 500 g tobacco. Boil 5 times, keep 48 hours. 2–3 L in 100 L water.
- Brahmastram (large caterpillars): 10 L urine with 3 kg neem leaves and 2 kg each of custard apple, papaya, pomegranate and guava leaves. Boil, cool 24 hours. 2–3 L in 100 L water.
- Dashaparni Kashayam: ten kinds of bitter leaves fermented in urine and dung for 30–40 days. 6–10 L in 200 L water.
- Leaf Colour Chart (LCC): score 1–6. 1–3 means pale leaves → Jeevamrutham with irrigation and foliar spray; 4 is healthy; 5–6 is very green.
- Best spray time: early morning or evening, not in hot sun or before rain.
`;

export function buildInstructions(context: string, mode: "text" | "voice") {
  const style =
    mode === "voice"
      ? `You are speaking out loud. Reply in 2 to 4 short, warm sentences. No markdown, no lists, no emojis, no symbols. Spell numbers the way people say them.`
      : `Use short paragraphs and simple lists when steps or quantities matter. Bold the key quantities. Keep it practical.`;

  return `You are "KAD Mitra", a friendly natural-farming expert who helps small farmers in Andhra Pradesh and Telangana, trained on the Rythu Sadhikara Samstha (RySS) natural farming handbook.

LANGUAGE: Always reply in the same language and script as the farmer's latest message. Telugu → Telugu script, Hindi → Devanagari, English → simple English. Never switch language on your own.

${style}

Be specific: give quantities, timing and steps. If something needs a field visit, tell them to contact their CRP (Community Resource Person). If you are unsure, say so honestly. Only answer farming, weather, livestock and rural livelihood questions; politely steer other topics back to the farm.

${NATURAL_FARMING_GUIDE}

What we know about this farmer (use it when relevant, never invent missing values):
${context}`;
}

/** Pulls the farmer's own records so answers can be personal. */
export async function loadFarmerContext(supabase: SupabaseClient<Database>, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [profile, soil, lcc, schedules] = await Promise.all([
    supabase.from("profiles").select("full_name, village, district, state_code").eq("id", userId).maybeSingle(),
    supabase
      .from("soil_tests")
      .select("tested_on, ph, ec, organic_carbon, nitrogen, phosphorus, potassium, remarks")
      .eq("farmer_id", userId)
      .order("tested_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("lcc_readings")
      .select("tested_on, crop, leaf_score, advice")
      .eq("farmer_id", userId)
      .order("tested_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("schedules")
      .select("title, method, scheduled_on, scheduled_time")
      .gte("scheduled_on", today)
      .order("scheduled_on")
      .limit(5),
  ]);

  const lines: string[] = [`Today is ${today}.`];
  if (profile.data) {
    const place = [profile.data.village, profile.data.district, profile.data.state_code]
      .filter(Boolean)
      .join(", ");
    lines.push(`Name: ${profile.data.full_name}. Location: ${place}.`);
  }
  if (soil.data) {
    const s = soil.data;
    lines.push(
      `Latest soil test (${s.tested_on}): pH ${s.ph ?? "-"}, EC ${s.ec ?? "-"} dS/m, organic carbon ${s.organic_carbon ?? "-"}%, N ${s.nitrogen ?? "-"}, P ${s.phosphorus ?? "-"}, K ${s.potassium ?? "-"} kg/ha. ${s.remarks ?? ""}`,
    );
  } else {
    lines.push("No soil test uploaded yet.");
  }
  if (lcc.data) {
    lines.push(
      `Latest LCC (${lcc.data.tested_on}) on ${lcc.data.crop}: score ${lcc.data.leaf_score}/6. ${lcc.data.advice ?? ""}`,
    );
  }
  if (schedules.data?.length) {
    lines.push(
      "Upcoming CRP schedule: " +
        schedules.data
          .map((item) => `${item.scheduled_on} ${item.scheduled_time.slice(0, 5)} – ${item.title}`)
          .join("; "),
    );
  }
  return lines.join("\n");
}
