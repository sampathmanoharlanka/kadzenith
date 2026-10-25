import { Check } from "lucide-react";

import { STATUS_STEPS, type BookingStatus } from "@/lib/booking";
import { cn } from "@/lib/utils";

const STEP_LABEL: Record<BookingStatus, string> = {
  requested: "Requested",
  accepted: "Accepted",
  in_progress: "Working",
  completed: "Done",
  cancelled: "Cancelled",
};

export function StatusSteps({ status }: { status: string }) {
  const current = STATUS_STEPS.indexOf(status as BookingStatus);

  return (
    <ol className="flex items-start">
      {STATUS_STEPS.map((step, index) => {
        const done = index < current || status === "completed";
        const active = index === current && status !== "completed";
        return (
          <li key={step} className="relative flex flex-1 flex-col items-center gap-1.5">
            {index > 0 && (
              <span
                className={cn(
                  "absolute top-3.5 right-1/2 h-0.5 w-full -translate-y-1/2",
                  index <= current ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 grid size-7 place-items-center rounded-full text-xs font-bold transition-colors",
                done && "bg-primary text-primary-foreground",
                active && "bg-ink text-ink-foreground ring-4 ring-leaf-soft",
                !done && !active && "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span className={cn("text-[11px] font-medium", active ? "text-foreground" : "text-muted-foreground")}>
              {STEP_LABEL[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
