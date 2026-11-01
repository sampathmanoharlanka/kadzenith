import type { Tables } from "@/integrations/supabase/types";

export type FarmRecord = Tables<"farm_records">;
export type RecordKind = "expense" | "sale";

export const EXPENSE_CATEGORIES = [
  { id: "Seeds", te: "విత్తనాలు" },
  { id: "Labour", te: "కూలీ" },
  { id: "Bio-inputs", te: "జీవ ఎరువులు" },
  { id: "Ploughing", te: "దుక్కి" },
  { id: "Irrigation", te: "నీటి పారుదల" },
  { id: "Transport", te: "రవాణా" },
  { id: "Other", te: "ఇతర" },
] as const;

export const SALE_CATEGORIES = [
  { id: "Produce sale", te: "పంట అమ్మకం" },
  { id: "By-product", te: "ఉప ఉత్పత్తి" },
  { id: "Other", te: "ఇతర" },
] as const;

export interface Totals {
  revenue: number;
  expenses: number;
  net: number;
}

export interface CropTotals extends Totals {
  crop: string;
}

type Entry = Pick<FarmRecord, "kind" | "amount" | "crop">;

function round(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Revenue = sum of sale entries, Expenses = sum of expense entries,
 * Net income = Revenue − Expenses. Nothing else is added or estimated.
 */
export function summarize(records: Entry[]): Totals {
  let revenue = 0;
  let expenses = 0;
  for (const record of records) {
    const amount = Number(record.amount);
    if (!Number.isFinite(amount)) continue;
    if (record.kind === "sale") revenue += amount;
    else if (record.kind === "expense") expenses += amount;
  }
  return { revenue: round(revenue), expenses: round(expenses), net: round(revenue - expenses) };
}

/** Same totals split by crop name (case-insensitive), biggest activity first. */
export function summarizeByCrop(records: Entry[]): CropTotals[] {
  const groups = new Map<string, { crop: string; items: Entry[] }>();
  for (const record of records) {
    const name = record.crop.trim();
    const key = name.toLowerCase();
    const group = groups.get(key) ?? { crop: name, items: [] };
    group.items.push(record);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map(({ crop, items }) => ({ crop, ...summarize(items) }))
    .sort((a, b) => b.revenue + b.expenses - (a.revenue + a.expenses));
}
