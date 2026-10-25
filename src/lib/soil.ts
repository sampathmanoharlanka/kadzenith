export type Level = "low" | "medium" | "high";

interface Nutrient {
  key: "nitrogen" | "phosphorus" | "potassium" | "organic_carbon";
  label: string;
  labelTe: string;
  unit: string;
  /** Upper bound for "low" and for "medium" (Soil Health Card ranges). */
  bands: [number, number];
}

export const NUTRIENTS: Nutrient[] = [
  { key: "nitrogen", label: "Nitrogen (N)", labelTe: "నత్రజని", unit: "kg/ha", bands: [280, 560] },
  { key: "phosphorus", label: "Phosphorus (P)", labelTe: "భాస్వరం", unit: "kg/ha", bands: [10, 25] },
  { key: "potassium", label: "Potassium (K)", labelTe: "పొటాష్", unit: "kg/ha", bands: [108, 280] },
  {
    key: "organic_carbon",
    label: "Organic carbon",
    labelTe: "సేంద్రియ కర్బనం",
    unit: "%",
    bands: [0.5, 0.75],
  },
];

export function nutrientLevel(value: number, [lowMax, mediumMax]: [number, number]): Level {
  if (value < lowMax) return "low";
  if (value <= mediumMax) return "medium";
  return "high";
}

export function phStatus(ph: number) {
  if (ph < 6.5) return { label: "Acidic", tone: "warning" as const };
  if (ph <= 7.5) return { label: "Ideal", tone: "good" as const };
  return { label: "Alkaline", tone: "warning" as const };
}

export function ecStatus(ec: number) {
  if (ec < 1) return { label: "Normal", tone: "good" as const };
  if (ec <= 2) return { label: "Slightly salty", tone: "warning" as const };
  return { label: "Salty", tone: "bad" as const };
}

export const LCC_PANELS = [1, 2, 3, 4, 5, 6] as const;

/** What the Leaf Colour Chart score means for the farmer. */
export function lccAdvice(score: number) {
  if (score <= 2) {
    return "Leaves are pale. Apply Jeevamrutham with irrigation this week and spread Ghanajeevamrutham.";
  }
  if (score === 3) {
    return "Leaves are slightly pale. Give a Jeevamrutham foliar spray and check again in 7 days.";
  }
  if (score === 4) return "Healthy green. Keep up your regular Jeevamrutham schedule.";
  return "Deep green — no extra nutrients needed. Watch for sucking pests.";
}
