import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Banknote, CheckCircle2, Loader2, MapPin, Phone, Smartphone, XCircle } from "lucide-react";
import { toast } from "sonner";

import { StatusPill } from "@/components/booking-card";
import { Screen } from "@/components/screen";
import { StatusSteps } from "@/components/status-steps";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookingsRealtime } from "@/hooks/use-bookings-realtime";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, type BookingStatus } from "@/lib/booking";
import { formatRupees, formatTime, friendlyDay, initials } from "@/lib/format";
import { bookingQuery, workTypesQuery } from "@/lib/queries";
import { workImage } from "@/lib/work-images";

export const Route = createFileRoute("/_authed/farmer/bookings/$bookingId")({
  head: () => ({
    meta: [
      { title: "Booking status — KAD" },
      { name: "description", content: "Track your labour booking live." },
      { property: "og:title", content: "Booking status — KAD" },
      { property: "og:description", content: "Live status of your labour request." },
    ],
  }),
  component: BookingStatusPage,
});

function BookingStatusPage() {
  const { bookingId } = Route.useParams();
  const { data: booking, isPending } = useQuery(bookingQuery(bookingId));
  const { data: workTypes } = useQuery(workTypesQuery);

  useBookingsRealtime(`id=eq.${bookingId}`, (payload) => {
    const next = payload.new as { status?: string } | undefined;
    if (next?.status === "accepted") toast.success("A labourer accepted your request!");
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("update_booking_status", {
        _booking_id: bookingId,
        _status: "cancelled",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => toast("Booking cancelled"),
    onError: (error) => toast.error(error.message),
  });

  if (isPending) {
    return (
      <Screen back title="Booking">
        <Skeleton className="mt-4 h-64 w-full rounded-3xl" />
      </Screen>
    );
  }

  if (!booking) {
    return (
      <Screen back title="Booking">
        <p className="mt-6 text-muted-foreground">This booking could not be found.</p>
      </Screen>
    );
  }

  const status = booking.status as BookingStatus;
  const workType = workTypes?.find((type) => type.id === booking.work_type_id);

  return (
    <Screen back title={workType?.name ?? "Booking"} action={<StatusPill status={status} />}>
      {/* Live status hero */}
      <section className="flex flex-col items-center rounded-[2rem] bg-muted px-6 pt-8 pb-6 text-center">
        <div className="relative grid size-36 place-items-center">
          {status === "requested" &&
            [0, 0.7, 1.4].map((delay) => (
              <span
                key={delay}
                className="absolute inset-0 rounded-full bg-primary/30 animate-kad-pulse-ring"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          <img
            src={workImage(booking.work_type_id)}
            alt=""
            width={816}
            height={816}
            className="relative size-28 rounded-full object-cover ring-4 ring-background"
          />
          {status === "completed" && (
            <CheckCircle2 className="absolute right-2 bottom-2 size-9 rounded-full bg-background text-primary" />
          )}
          {status === "cancelled" && (
            <XCircle className="absolute right-2 bottom-2 size-9 rounded-full bg-background text-muted-foreground" />
          )}
        </div>

        <h2 className="mt-5 text-2xl font-bold">{STATUS_LABEL[status]}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {status === "requested" && "Your request was sent to labourers nearby. Hang tight…"}
          {status === "accepted" && `${booking.labour_name} will reach your field on time.`}
          {status === "in_progress" && `${booking.labour_name} has started the work.`}
          {status === "completed" && "Work is done. Please settle the payment below."}
          {status === "cancelled" && "This booking was cancelled."}
        </p>

        {status !== "cancelled" && (
          <div className="mt-6 w-full">
            <StatusSteps status={status} />
          </div>
        )}
      </section>

      {/* Labourer contact, Uber style */}
      {booking.labour_name && status !== "cancelled" && (
        <section className="mt-4 flex items-center gap-3 rounded-3xl bg-background p-4 shadow-soft">
          <span className="grid size-12 place-items-center rounded-full bg-sky-soft font-display font-bold text-sky">
            {initials(booking.labour_name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{booking.labour_name}</p>
            <p className="text-xs text-muted-foreground">Your labourer</p>
          </div>
          {booking.labour_phone && (
            <Button asChild variant="ink" size="icon-lg" aria-label={`Call ${booking.labour_name}`}>
              <a href={`tel:+91${booking.labour_phone}`}>
                <Phone />
              </a>
            </Button>
          )}
        </section>
      )}

      {/* Trip details */}
      <section className="mt-4 divide-y rounded-3xl bg-muted px-5">
        <Detail label="When" value={`${friendlyDay(booking.work_date)} · ${formatTime(booking.start_time)}`} />
        <Detail label="Duration" value={`${booking.hours} hours`} />
        <Detail label="Rate (by CRP)" value={`${formatRupees(Number(booking.rate_per_hour))}/hour`} />
        {booking.village && (
          <Detail
            label="Field"
            value={
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {booking.village}
              </span>
            }
          />
        )}
        <Detail
          label="Payment"
          value={
            <span className="flex items-center gap-1.5">
              {booking.payment_method === "upi" ? <Smartphone className="size-4" /> : <Banknote className="size-4" />}
              {booking.payment_method === "upi" ? "UPI" : "Cash"}
            </span>
          }
        />
        <div className="flex items-center justify-between py-4">
          <span className="font-semibold">Total</span>
          <span className="font-display text-2xl font-bold tabular-nums">
            {formatRupees(Number(booking.total_amount))}
          </span>
        </div>
      </section>

      {status === "completed" && (
        <p className="mt-4 rounded-2xl bg-leaf-soft px-4 py-3 text-sm text-accent-foreground">
          {booking.payment_method === "upi"
            ? `Pay ${formatRupees(Number(booking.total_amount))} by UPI to ${booking.labour_name}${booking.labour_phone ? ` (${booking.labour_phone})` : ""}.`
            : `Pay ${formatRupees(Number(booking.total_amount))} in cash to ${booking.labour_name}.`}
        </p>
      )}

      {(status === "requested" || status === "accepted") && (
        <Button
          variant="ghost"
          className="mt-4 mb-8 w-full text-destructive"
          disabled={cancel.isPending}
          onClick={() => cancel.mutate()}
        >
          {cancel.isPending && <Loader2 className="animate-spin" />}
          Cancel booking
        </Button>
      )}
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
