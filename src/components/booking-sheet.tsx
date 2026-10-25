import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { Banknote, Loader2, Minus, Plus, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  MAX_HOURS,
  MIN_HOURS,
  START_TIMES,
  bookingTotal,
  clampHours,
  type WorkType,
} from "@/lib/booking";
import { formatRupees, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { workImage } from "@/lib/work-images";

export interface BookingRequest {
  workDate: string;
  startTime: string;
  hours: number;
  paymentMethod: "cash" | "upi";
  notes: string;
}

interface BookingSheetProps {
  workType: WorkType | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (request: BookingRequest) => void;
}

export function BookingSheet({ workType, submitting, onClose, onSubmit }: BookingSheetProps) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)), []);
  const [workDate, setWorkDate] = useState(format(days[0], "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("07:00");
  const [hours, setHours] = useState(4);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi">("cash");
  const [notes, setNotes] = useState("");

  const rate = Number(workType?.rate_per_hour ?? 0);

  return (
    <Drawer open={Boolean(workType)} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="mx-auto max-w-[30rem] rounded-t-[2rem]">
        {workType && (
          <div className="max-h-[80dvh] overflow-y-auto px-5 pb-safe">
            <div className="flex items-center gap-4 pt-2">
              <img
                src={workImage(workType.id)}
                alt=""
                width={816}
                height={816}
                className="size-16 rounded-full object-cover"
              />
              <div>
                <DrawerTitle className="font-display text-2xl font-bold">{workType.name}</DrawerTitle>
                <DrawerDescription>
                  {formatRupees(rate)}/hour · rate fixed by your CRP
                </DrawerDescription>
              </div>
            </div>

            <p className="mt-6 mb-2 text-sm font-semibold">Which day?</p>
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
              {days.map((day) => {
                const value = format(day, "yyyy-MM-dd");
                const selected = value === workDate;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setWorkDate(value)}
                    className={cn(
                      "flex w-14 shrink-0 flex-col items-center rounded-2xl py-2.5 transition-colors",
                      selected ? "bg-ink text-ink-foreground" : "bg-muted",
                    )}
                  >
                    <span className="text-[11px] font-medium opacity-70">{format(day, "EEE")}</span>
                    <span className="font-display text-lg font-bold">{format(day, "d")}</span>
                  </button>
                );
              })}
            </div>

            <p className="mt-5 mb-2 text-sm font-semibold">Start time</p>
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
              {START_TIMES.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setStartTime(time)}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    time === startTime ? "bg-ink text-ink-foreground" : "bg-muted",
                  )}
                >
                  {formatTime(time)}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">How many hours?</p>
                <p className="text-xs text-muted-foreground">
                  {MIN_HOURS}–{MAX_HOURS} hours
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-full bg-muted p-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="rounded-full bg-background"
                  aria-label="Fewer hours"
                  onClick={() => setHours((h) => clampHours(h - 1))}
                  disabled={hours <= MIN_HOURS}
                >
                  <Minus />
                </Button>
                <span className="w-6 text-center font-display text-xl font-bold tabular-nums">{hours}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="rounded-full bg-background"
                  aria-label="More hours"
                  onClick={() => setHours((h) => clampHours(h + 1))}
                  disabled={hours >= MAX_HOURS}
                >
                  <Plus />
                </Button>
              </div>
            </div>

            <p className="mt-5 mb-2 text-sm font-semibold">Payment</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "cash", label: "Cash", icon: Banknote },
                  { id: "upi", label: "UPI", icon: Smartphone },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPaymentMethod(option.id)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-colors",
                    paymentMethod === option.id ? "bg-ink text-ink-foreground" : "bg-muted",
                  )}
                >
                  <option.icon className="size-4" />
                  {option.label}
                </button>
              ))}
            </div>

            <Input
              className="mt-4"
              placeholder="Note for the labourer (optional)"
              value={notes}
              maxLength={200}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="sticky bottom-0 mt-6 flex items-center gap-4 bg-background py-4">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-display text-2xl font-bold tabular-nums">
                  {formatRupees(bookingTotal(rate, hours))}
                </p>
              </div>
              <Button
                variant="ink"
                size="xl"
                className="flex-1"
                disabled={submitting}
                onClick={() => onSubmit({ workDate, startTime, hours, paymentMethod, notes: notes.trim() })}
              >
                {submitting && <Loader2 className="animate-spin" />}
                Request labour
              </Button>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
