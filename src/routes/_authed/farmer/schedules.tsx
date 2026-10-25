import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";

import { ScheduleList } from "@/components/schedule-list";
import { EmptyState, Screen, SectionTitle } from "@/components/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/lib/auth";
import { METHODS } from "@/lib/natural-farming";
import { farmerSchedulesQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/farmer/schedules")({
  head: () => ({
    meta: [
      { title: "Natural farming schedule — KAD" },
      { name: "description", content: "Dates and timings for Beejamrutham, Jeevamrutham and other natural inputs." },
      { property: "og:title", content: "Natural farming schedule — KAD" },
      { property: "og:description", content: "Your CRP's natural farming calendar." },
    ],
  }),
  component: SchedulesPage,
});

function SchedulesPage() {
  const profile = useProfile();
  const { data, isPending } = useQuery(farmerSchedulesQuery(profile.id));
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (data ?? []).filter((item) => item.scheduled_on >= today);
  const past = (data ?? []).filter((item) => item.scheduled_on < today).reverse();

  return (
    <Screen back title="Natural farming schedule" subtitle="Dates & timings from your CRP">
      <div className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {METHODS.slice(0, 6).map((method) => (
          <span
            key={method.id}
            title={method.purpose}
            className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold", method.tone)}
          >
            {method.nameTe}
          </span>
        ))}
      </div>

      {isPending && <Skeleton className="h-40 rounded-3xl" />}

      {data && upcoming.length === 0 && (
        <EmptyState icon={CalendarClock} title="Nothing scheduled">
          Your CRP hasn't added upcoming tasks yet.
        </EmptyState>
      )}

      {upcoming.length > 0 && (
        <section>
          <SectionTitle>Coming up</SectionTitle>
          <ScheduleList items={upcoming} />
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-8 pb-8 opacity-70">
          <SectionTitle>Done</SectionTitle>
          <ScheduleList items={past} />
        </section>
      )}
    </Screen>
  );
}
