import { format, parseISO } from "date-fns";
import { Clock, Trash2, UserRound } from "lucide-react";

import type { Tables } from "@/integrations/supabase/types";
import { formatTime, friendlyDay } from "@/lib/format";
import { findMethod } from "@/lib/natural-farming";
import { cn } from "@/lib/utils";

type Schedule = Tables<"schedules">;

interface ScheduleListProps {
  items: Schedule[];
  onDelete?: (id: string) => void;
}

/** Timeline of natural farming tasks, newest first for the farmer to act on. */
export function ScheduleList({ items, onDelete }: ScheduleListProps) {
  return (
    <ol className="space-y-3">
      {items.map((item) => {
        const method = findMethod(item.method);
        const date = parseISO(item.scheduled_on);
        return (
          <li key={item.id} className="flex gap-4 rounded-3xl bg-muted p-4">
            <div className="flex w-12 shrink-0 flex-col items-center rounded-2xl bg-background py-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                {format(date, "MMM")}
              </span>
              <span className="font-display text-2xl leading-none font-bold">{format(date, "d")}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", method.tone)}>
                  {method.name} · {method.nameTe}
                </span>
                {item.farmer_id && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <UserRound className="size-3" /> Just for you
                  </span>
                )}
              </div>
              <p className="mt-1.5 font-semibold">{item.title}</p>
              {item.details && <p className="mt-0.5 text-sm text-muted-foreground">{item.details}</p>}
              <p className="mt-2 flex items-center gap-1 text-xs font-medium">
                <Clock className="size-3.5" />
                {friendlyDay(item.scheduled_on)} · {formatTime(item.scheduled_time)}
              </p>
            </div>
            {onDelete && (
              <button
                type="button"
                aria-label="Delete schedule"
                onClick={() => onDelete(item.id)}
                className="self-start rounded-full p-2 text-muted-foreground transition-colors hover:bg-background hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
