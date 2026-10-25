import type { WeatherKind } from "@/lib/weather";
import { cn } from "@/lib/utils";

/**
 * Hand-drawn style weather icons. Colours come from the design tokens
 * (turmeric sun, sky rain, soft clouds) so they match the rest of the app.
 */
export function WeatherIcon({ kind, className }: { kind: WeatherKind; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-12", className)} aria-hidden="true">
      {kind === "sunny" && <Sun />}
      {kind === "night" && <Moon />}
      {kind === "partly" && (
        <>
          <g transform="translate(-8 -8) scale(0.85)">
            <Sun />
          </g>
          <Cloud y={8} />
        </>
      )}
      {kind === "cloudy" && (
        <>
          <Cloud x={-6} y={-6} muted />
          <Cloud y={4} />
        </>
      )}
      {kind === "fog" && (
        <>
          <Cloud y={-4} muted />
          {[44, 51].map((y) => (
            <line
              key={y}
              x1="14"
              x2="50"
              y1={y}
              y2={y}
              strokeWidth="3.5"
              strokeLinecap="round"
              className="stroke-muted-foreground/40"
            />
          ))}
        </>
      )}
      {kind === "rain" && (
        <>
          <Cloud y={-4} />
          <Drops />
        </>
      )}
      {kind === "storm" && (
        <>
          <Cloud y={-4} muted />
          <path
            d="M34 38 L27 49 h6 l-3 10 l10 -14 h-6 l3 -7 z"
            className="fill-turmeric stroke-soil/30"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}

function Sun() {
  return (
    <g>
      <g className="origin-center animate-kad-spin-slow [transform-box:fill-box]">
        {Array.from({ length: 8 }, (_, i) => (
          <line
            key={i}
            x1="32"
            y1="6"
            x2="32"
            y2="13"
            strokeWidth="4"
            strokeLinecap="round"
            className="stroke-turmeric"
            transform={`rotate(${i * 45} 32 32)`}
          />
        ))}
      </g>
      <circle cx="32" cy="32" r="14" className="fill-turmeric" />
      <circle cx="32" cy="32" r="14" className="fill-saffron/20" />
      {/* friendly face */}
      <circle cx="27" cy="30" r="1.6" className="fill-soil" />
      <circle cx="37" cy="30" r="1.6" className="fill-soil" />
      <path d="M27 36 q5 4 10 0" fill="none" strokeWidth="1.8" strokeLinecap="round" className="stroke-soil" />
      <circle cx="24" cy="35" r="2" className="fill-saffron/40" />
      <circle cx="40" cy="35" r="2" className="fill-saffron/40" />
    </g>
  );
}

function Moon() {
  return (
    <g>
      <path d="M38 10 a22 22 0 1 0 16 34 a17 17 0 1 1 -16 -34 z" className="fill-turmeric" />
      <circle cx="30" cy="34" r="1.5" className="fill-soil" />
      <path d="M33 41 q3 2 6 0" fill="none" strokeWidth="1.6" strokeLinecap="round" className="stroke-soil" />
      {[
        [50, 14, 2],
        [56, 26, 1.4],
        [12, 14, 1.4],
      ].map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} className="animate-pulse fill-sky" />
      ))}
    </g>
  );
}

function Cloud({ x = 0, y = 0, muted = false }: { x?: number; y?: number; muted?: boolean }) {
  return (
    <path
      transform={`translate(${x} ${y})`}
      d="M20 46 h26 a9 9 0 0 0 0 -18 a13 13 0 0 0 -25 -3 a10.5 10.5 0 0 0 -1 21 z"
      className={cn(muted ? "fill-border" : "fill-sky-soft", "stroke-sky/30")}
      strokeWidth="1.5"
    />
  );
}

function Drops() {
  return (
    <g className="fill-sky">
      {[22, 32, 42].map((x, i) => (
        <path
          key={x}
          d={`M${x} 46 q-3 5 0 7 q3 -2 0 -7 z`}
          className="animate-kad-float"
          style={{ animationDelay: `${i * 0.25}s` }}
        />
      ))}
    </g>
  );
}
