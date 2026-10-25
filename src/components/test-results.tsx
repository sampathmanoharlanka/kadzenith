import type { Tables } from "@/integrations/supabase/types";
import { shortDate } from "@/lib/format";
import { LCC_PANELS, NUTRIENTS, ecStatus, lccAdvice, nutrientLevel, phStatus, type Level } from "@/lib/soil";
import { cn } from "@/lib/utils";

type SoilTest = Tables<"soil_tests">;
type LccReading = Tables<"lcc_readings">;

const PANEL_COLOR = ["bg-lcc-1", "bg-lcc-2", "bg-lcc-3", "bg-lcc-4", "bg-lcc-5", "bg-lcc-6"];

/** The green tape: six shades with the farmer's score lifted up. */
export function LccStrip({ score }: { score: number }) {
  return (
    <div className="flex items-end gap-1.5" role="img" aria-label={`Leaf colour score ${score} of 6`}>
      {LCC_PANELS.map((panel, i) => (
        <div key={panel} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={cn(
              "w-full rounded-xl transition-all",
              PANEL_COLOR[i],
              panel === score ? "h-16 ring-4 ring-ink ring-offset-2" : "h-10 opacity-60",
            )}
          />
          <span className={cn("text-xs", panel === score ? "font-bold" : "text-muted-foreground")}>{panel}</span>
        </div>
      ))}
    </div>
  );
}

export function LccCard({ reading }: { reading: LccReading }) {
  return (
    <article className="rounded-3xl bg-muted p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-bold">{reading.crop}</h3>
        <span className="text-xs text-muted-foreground">Checked {shortDate(reading.tested_on)}</span>
      </div>
      <div className="mt-4">
        <LccStrip score={reading.leaf_score} />
      </div>
      <p className="mt-4 rounded-2xl bg-background px-4 py-3 text-sm">
        {reading.advice || lccAdvice(reading.leaf_score)}
      </p>
    </article>
  );
}

const LEVEL_STYLE: Record<Level, { bar: string; text: string; width: string; label: string }> = {
  low: { bar: "bg-saffron", text: "text-saffron", width: "w-1/3", label: "Low" },
  medium: { bar: "bg-turmeric", text: "text-soil", width: "w-2/3", label: "Medium" },
  high: { bar: "bg-leaf", text: "text-primary", width: "w-full", label: "High" },
};

const TONE_STYLE = {
  good: "bg-leaf-soft text-primary",
  warning: "bg-turmeric-soft text-soil",
  bad: "bg-saffron-soft text-saffron",
};

export function SoilTestCard({ test }: { test: SoilTest }) {
  const ph = test.ph != null ? phStatus(Number(test.ph)) : null;
  const ec = test.ec != null ? ecStatus(Number(test.ec)) : null;

  return (
    <article className="rounded-3xl bg-muted p-5">
      <p className="text-xs text-muted-foreground">Tested on {shortDate(test.tested_on)}</p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Metric label="pH" value={test.ph} status={ph} />
        <Metric label="EC (dS/m)" value={test.ec} status={ec} />
      </div>

      <ul className="mt-4 space-y-3">
        {NUTRIENTS.map((nutrient) => {
          const raw = test[nutrient.key];
          if (raw == null) return null;
          const value = Number(raw);
          const level = LEVEL_STYLE[nutrientLevel(value, nutrient.bands)];
          return (
            <li key={nutrient.key}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">
                  {nutrient.label} <span className="text-xs text-muted-foreground">{nutrient.labelTe}</span>
                </span>
                <span className="tabular-nums">
                  {value} {nutrient.unit} · <span className={cn("font-semibold", level.text)}>{level.label}</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-background">
                <div className={cn("h-full rounded-full", level.bar, level.width)} />
              </div>
            </li>
          );
        })}
      </ul>

      {test.remarks && (
        <p className="mt-4 rounded-2xl bg-background px-4 py-3 text-sm">
          <span className="font-semibold">CRP note: </span>
          {test.remarks}
        </p>
      )}
    </article>
  );
}

function Metric({
  label,
  value,
  status,
}: {
  label: string;
  value: number | null;
  status: { label: string; tone: keyof typeof TONE_STYLE } | null;
}) {
  return (
    <div className="rounded-2xl bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-3xl font-bold tabular-nums">{value ?? "–"}</p>
      {status && (
        <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold", TONE_STYLE[status.tone])}>
          {status.label}
        </span>
      )}
    </div>
  );
}
