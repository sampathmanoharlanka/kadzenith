import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tractor } from "lucide-react";
import { toast } from "sonner";

import { BookingSheet, type BookingRequest } from "@/components/booking-sheet";
import { BookingSummary } from "@/components/booking-card";
import { EmptyState, Screen, SectionTitle } from "@/components/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import type { WorkType } from "@/lib/booking";
import { formatRupees } from "@/lib/format";
import { farmerBookingsQuery, workTypesQuery } from "@/lib/queries";
import { workImage } from "@/lib/work-images";

export const Route = createFileRoute("/_authed/farmer/book")({
  head: () => ({
    meta: [
      { title: "Book labour — KAD" },
      { name: "description", content: "Pick the work, the time and book a labourer at the CRP rate." },
      { property: "og:title", content: "Book labour — KAD" },
      { property: "og:description", content: "Book farm labour as easily as a ride." },
    ],
  }),
  component: BookLabourPage,
});

function BookLabourPage() {
  const profile = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<WorkType | null>(null);

  const workTypes = useQuery(workTypesQuery);
  const bookings = useQuery(farmerBookingsQuery(profile.id));
  const workTypeById = new Map((workTypes.data ?? []).map((type) => [type.id, type]));

  const createBooking = useMutation({
    mutationFn: async (request: BookingRequest) => {
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          farmer_id: profile.id,
          work_type_id: selected!.id,
          work_date: request.workDate,
          start_time: request.startTime,
          hours: request.hours,
          payment_method: request.paymentMethod,
          notes: request.notes || null,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: ({ id }) => {
      setSelected(null);
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      navigate({ to: "/farmer/bookings/$bookingId", params: { bookingId: id } });
    },
    onError: () => toast.error("Could not send the request. Please try again."),
  });

  return (
    <Screen title="Book labour" subtitle="కూలీలను బుక్ చేయండి">
      <p className="mb-4 text-sm text-muted-foreground">Choose the work you need help with.</p>

      <div className="grid grid-cols-3 gap-x-3 gap-y-5">
        {workTypes.isPending &&
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="aspect-square w-full rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}

        {workTypes.data?.map((type, index) => (
          <button
            key={type.id}
            type="button"
            onClick={() => setSelected(type)}
            className="group flex flex-col items-center text-center animate-kad-rise"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <span className="aspect-square w-full overflow-hidden rounded-full bg-turmeric-soft ring-0 ring-primary transition-all group-hover:ring-4 group-active:scale-95">
              <img
                src={workImage(type.id)}
                alt=""
                loading="lazy"
                width={816}
                height={816}
                className="size-full object-cover"
              />
            </span>
            <span className="mt-2 text-sm leading-tight font-semibold">{type.name}</span>
            <span className="text-[11px] text-muted-foreground">
              {type.name_te} · {formatRupees(Number(type.rate_per_hour))}/h
            </span>
          </button>
        ))}
      </div>

      <section className="mt-10">
        <SectionTitle>Your bookings</SectionTitle>
        {bookings.isPending ? (
          <Skeleton className="h-20 w-full rounded-3xl" />
        ) : bookings.data?.length ? (
          <ul className="space-y-2">
            {bookings.data.map((booking) => (
              <li key={booking.id}>
                <Link
                  to="/farmer/bookings/$bookingId"
                  params={{ bookingId: booking.id }}
                  className="block rounded-3xl bg-muted p-3 transition-colors hover:bg-secondary"
                >
                  <BookingSummary booking={booking} workType={workTypeById.get(booking.work_type_id)} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Tractor} title="No bookings yet">
            Tap a work above to book your first labourer.
          </EmptyState>
        )}
      </section>

      <BookingSheet
        key={selected?.id ?? "closed"}
        workType={selected}
        submitting={createBooking.isPending}
        onClose={() => setSelected(null)}
        onSubmit={(request) => createBooking.mutate(request)}
      />
    </Screen>
  );
}
