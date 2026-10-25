import { CalendarDays, Clock } from "lucide-react";

import type { Booking, BookingStatus, WorkType } from "@/lib/booking";
import { STATUS_LABEL } from "@/lib/booking";
import { formatRupees, formatTime, friendlyDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { workImage } from "@/lib/work-images";

const STATUS_TONE: Record<BookingStatus, string> = {
  requested: "bg-turmeric-soft text-soil",
  accepted: "bg-sky-soft text-sky",
  in_progress: "bg-leaf-soft text-primary",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground line-through",
};

export function StatusPill({ status }: { status: string }) {
  const key = status as BookingStatus;
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", STATUS_TONE[key])}>
      {STATUS_LABEL[key] ?? status}
    </span>
  );
}

/** One row in a list of bookings — used by farmers and labourers. */
export function BookingSummary({
  booking,
  workType,
  showStatus = true,
}: {
  booking: Booking;
  workType?: WorkType;
  showStatus?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={workImage(booking.work_type_id)}
        alt=""
        loading="lazy"
        width={816}
        height={816}
        className="size-14 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold">{workType?.name ?? booking.work_type_id}</p>
          {showStatus && <StatusPill status={booking.status} />}
        </div>
        <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {friendlyDay(booking.work_date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {formatTime(booking.start_time)} · {booking.hours}h
          </span>
        </p>
      </div>
      <p className="shrink-0 font-display font-bold tabular-nums">{formatRupees(Number(booking.total_amount))}</p>
    </div>
  );
}
