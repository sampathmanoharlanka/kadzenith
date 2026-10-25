import { cn } from "@/lib/utils";

/**
 * The KAD wordmark with its hand-drawn arrow underneath.
 * `animated` plays the splash transition: letters rise, then the arrow grows.
 */
export function KadLogo({ animated = false, className }: { animated?: boolean; className?: string }) {
  return (
    <div className={cn("inline-flex flex-col items-center", className)}>
      <span
        className={cn(
          "font-display text-[1em] leading-none font-extrabold tracking-tight text-gradient-kad",
          animated && "animate-kad-shimmer",
        )}
      >
        {"KAD".split("").map((letter, i) => (
          <span
            key={letter}
            className={cn("inline-block", animated && "animate-kad-rise")}
            style={animated ? { animationDelay: `${i * 0.12}s` } : undefined}
          >
            {letter}
          </span>
        ))}
      </span>
      <svg viewBox="0 0 120 30" className="mt-[0.08em] w-[1.6em]" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="kad-arrow" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--leaf)" />
            <stop offset="50%" stopColor="var(--turmeric)" />
            <stop offset="100%" stopColor="var(--saffron)" />
          </linearGradient>
        </defs>
        <path
          d="M6 8 C 30 26, 50 26, 62 14 S 96 4, 112 20 M112 20 l-11 1 M112 20 l-1 -11"
          stroke="url(#kad-arrow)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animated ? "animate-kad-draw" : undefined}
          style={animated ? ({ "--path-length": 170 } as React.CSSProperties) : undefined}
        />
      </svg>
    </div>
  );
}
