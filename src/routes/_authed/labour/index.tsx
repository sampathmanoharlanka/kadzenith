import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Loader2, MapPin, Phone, Smartphone, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { BookingSummary, StatusPill } from "@/components/booking-card";
import { EmptyState, Screen, SectionTitle } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/user-avatar";
import { useBookingsRealtime } from "@/hooks/use-bookings-realtime";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import type { Booking, WorkType } from "@/lib/booking";
import { formatRupees, formatTime, friendlyDay } from "@/lib/format";
import { labourJobsQuery, workTypesQuery } from "@/lib/queries";
import { workImage } from "@/lib/work-images";

export const Route = createFileRoute("/_authed/labour/")({
  head: () => ({
    meta: [
      { title: "Work requests — KAD Labour" },
      { name: "description", content: "Go online, accept farm work near you and track your earnings." },
      { property: "og:title", content: "Work requests — KAD Labour" },
      { property: "og:description", content: "Accept farm work requests like a ride." },
    ],
  }),
  component: LabourHome,
});

const ONLINE_KEY = "kad:labour-online";

function LabourHome() {
  const profile = useProfile();
  const queryClient = useQueryClient();
  const [online, setOnline] = useState(true);
  const [declined, setDeclined] = useState<string[]>([]);

  useEffect(() => {
    setOnline(localStorage.getItem(ONLINE_KEY) !== "false");
  }, []);

  function toggleOnline(value: boolean) {
    setOnline(value);
    localStorage.setItem(ONLINE_KEY, String(value));
  }

  const jobs = useQuery(labourJobsQuery(profile.id));
  const { data: workTypes } = useQuery(workTypesQuery);
  const workTypeById = new Map((workTypes ?? []).map((type) => [type.id, type]));

  useBookingsRealtime(undefined, (payload) => {
    const row = payload.new as Partial<Booking>;
    if (payload.eventType === "INSERT" && row.status === "requested" && online) {
      toast("New work request nearby", { description: row.village ?? undefined });
      navigator.vibrate?.(200);
    }
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["bookings"] });

  const accept = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase.rpc("accept_booking", { _booking_id: bookingId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Work accepted. The farmer has been told.");
      void refresh();
    },
    onError: (error) => {
      toast.error(error.message);
      void refresh();
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "in_progress" | "completed" }) => {
      const { error } = await supabase.rpc("update_booking_status", { _booking_id: id, _status: status });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, { status }) => {
      toast.success(status === "completed" ? "Great work! Job completed." : "Work started");
      void refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  const today = new Date().toISOString().slice(0, 10);
  const mine = jobs.data?.mine ?? [];
  const active = mine.filter((job) => job.status === "accepted" || job.status === "in_progress");
  const history = mine.filter((job) => job.status === "completed" || job.status === "cancelled");
  const earnedToday = mine
    .filter((job) => job.status === "completed" && job.completed_at?.slice(0, 10) === today)
    .reduce((sum, job) => sum + Number(job.total_amount), 0);
  const requests = (jobs.data?.open ?? []).filter((job) => !declined.includes(job.id));

  return (
    <Screen className="space-y-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-3">
        <Link to="/profile" aria-label="Your profile">
          <UserAvatar name={profile.full_name} path={profile.avatar_url} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Namaste</p>
          <p className="truncate font-display text-lg font-bold">{profile.full_name}</p>
        </div>
        <label className="flex items-center gap-2 rounded-full bg-muted py-1.5 pr-1.5 pl-3 text-sm font-semibold">
          {online ? "Online" : "Offline"}
          <Switch checked={online} onCheckedChange={toggleOnline} aria-label="Go online" />
        </label>
      </header>

      <section className="grid grid-cols-2 gap-3 rounded-3xl bg-ink p-5 text-ink-foreground">
        <div>
          <p className="text-xs opacity-70">Earned today</p>
          <p className="font-display text-3xl font-bold tabular-nums">{formatRupees(earnedToday)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-70">Jobs done</p>
          <p className="font-display text-3xl font-bold tabular-nums">
            {mine.filter((job) => job.status === "completed").length}
          </p>
        </div>
      </section>

      {active.length > 0 && (
        <section>
          <SectionTitle>Your current work</SectionTitle>
          <div className="space-y-3">
            {active.map((job) => (
              <article key={job.id} className="rounded-3xl bg-background p-4 shadow-lift ring-1 ring-border">
                <BookingSummary booking={job} workType={workTypeById.get(job.work_type_id)} />
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-muted p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{job.farmer_name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" /> {job.village ?? "Village not set"}
                    </p>
                  </div>
                  {job.farmer_phone && (
                    <Button asChild size="icon" variant="outline" className="rounded-full" aria-label="Call farmer">
                      <a href={`tel:+91${job.farmer_phone}`}>
                        <Phone />
                      </a>
                    </Button>
                  )}
                </div>
                {job.notes && <p className="mt-3 text-sm text-muted-foreground">“{job.notes}”</p>}
                <Button
                  variant={job.status === "accepted" ? "ink" : "default"}
                  size="lg"
                  className="mt-4 w-full"
                  disabled={updateStatus.isPending}
                  onClick={() =>
                    updateStatus.mutate({
                      id: job.id,
                      status: job.status === "accepted" ? "in_progress" : "completed",
                    })
                  }
                >
                  {updateStatus.isPending && <Loader2 className="animate-spin" />}
                  {job.status === "accepted" ? "I've reached — start work" : "Mark work complete"}
                </Button>
              </article>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle
          action={
            online && <span className="flex items-center gap-1 text-xs font-medium text-primary"><Wifi className="size-3.5" /> Live</span>
          }
        >
          New requests
        </SectionTitle>

        {!online ? (
          <EmptyState icon={WifiOff} title="You're offline">
            Go online to start receiving work requests from farmers.
          </EmptyState>
        ) : jobs.isPending ? (
          <Skeleton className="h-56 rounded-3xl" />
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl bg-muted px-6 py-10 text-center">
            <span className="relative grid size-14 place-items-center">
              <span className="absolute inset-0 rounded-full bg-primary/25 animate-kad-pulse-ring" />
              <span className="relative size-4 rounded-full bg-primary" />
            </span>
            <p className="mt-4 font-semibold">Looking for work near you…</p>
            <p className="mt-1 text-sm text-muted-foreground">New requests will pop up here instantly.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((job) => (
              <RequestCard
                key={job.id}
                job={job}
                workType={workTypeById.get(job.work_type_id)}
                accepting={accept.isPending && accept.variables === job.id}
                onAccept={() => accept.mutate(job.id)}
                onDecline={() => setDeclined((ids) => [...ids, job.id])}
              />
            ))}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section className="pb-4">
          <SectionTitle>Past work</SectionTitle>
          <ul className="divide-y rounded-3xl bg-muted px-4">
            {history.map((job) => (
              <li key={job.id} className="py-3">
                <BookingSummary booking={job} workType={workTypeById.get(job.work_type_id)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </Screen>
  );
}

function RequestCard({
  job,
  workType,
  accepting,
  onAccept,
  onDecline,
}: {
  job: Booking;
  workType?: WorkType;
  accepting: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-3xl bg-background shadow-lift ring-1 ring-border animate-kad-rise">
      <div className="flex items-center gap-4 p-4">
        <img
          src={workImage(job.work_type_id)}
          alt=""
          loading="lazy"
          width={816}
          height={816}
          className="size-20 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-display text-lg font-bold">{workType?.name ?? job.work_type_id}</p>
            <StatusPill status={job.status} />
          </div>
          <p className="font-display text-2xl font-bold tabular-nums">
            {formatRupees(Number(job.total_amount))}
            <span className="ml-1 text-sm font-medium text-muted-foreground">· {job.hours}h</span>
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t px-4 py-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">When</dt>
          <dd className="font-medium">
            {friendlyDay(job.work_date)}, {formatTime(job.start_time)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Where</dt>
          <dd className="truncate font-medium">{job.village ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Farmer</dt>
          <dd className="truncate font-medium">{job.farmer_name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Payment</dt>
          <dd className="flex items-center gap-1 font-medium">
            {job.payment_method === "upi" ? <Smartphone className="size-3.5" /> : <Banknote className="size-3.5" />}
            {job.payment_method === "upi" ? "UPI" : "Cash"}
          </dd>
        </div>
      </dl>
      {job.notes && <p className="px-4 pb-3 text-sm text-muted-foreground">“{job.notes}”</p>}

      <div className="grid grid-cols-[auto_1fr] gap-2 p-4 pt-0">
        <Button variant="secondary" size="xl" onClick={onDecline}>
          Decline
        </Button>
        <Button variant="ink" size="xl" onClick={onAccept} disabled={accepting}>
          {accepting && <Loader2 className="animate-spin" />}
          Accept
        </Button>
      </div>
    </article>
  );
}
