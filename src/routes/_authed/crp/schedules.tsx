import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";

import { ScheduleForm, type ScheduleDraft } from "@/components/schedule-form";
import { ScheduleList } from "@/components/schedule-list";
import { EmptyState, Screen, SectionTitle } from "@/components/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { commonSchedulesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authed/crp/schedules")({
  head: () => ({
    meta: [
      { title: "Schedules — KAD CRP" },
      { name: "description", content: "Set natural farming dates and timings for all your farmers." },
      { property: "og:title", content: "Schedules — KAD CRP" },
      { property: "og:description", content: "Natural farming calendar shared with every farmer." },
    ],
  }),
  component: CrpSchedulesPage,
});

function CrpSchedulesPage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(commonSchedulesQuery);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (data ?? []).filter((item) => item.scheduled_on >= today);

  const add = useMutation({
    mutationFn: async (draft: ScheduleDraft) => {
      const { error } = await supabase.from("schedules").insert({
        farmer_id: null,
        method: draft.method,
        title: draft.title,
        details: draft.details || null,
        scheduled_on: draft.scheduledOn,
        scheduled_time: draft.scheduledTime,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Shared with all farmers");
      void queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedules").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["schedules"] }),
    onError: (error) => toast.error(error.message),
  });

  return (
    <Screen title="Schedules" subtitle="Shared with every farmer">
      <ScheduleForm submitting={add.isPending} onSubmit={(draft) => add.mutateAsync(draft)} />

      <section className="mt-8 pb-6">
        <SectionTitle>Upcoming</SectionTitle>
        {isPending && <Skeleton className="h-32 rounded-3xl" />}
        {data && upcoming.length === 0 && (
          <EmptyState icon={CalendarClock} title="Nothing planned yet" />
        )}
        <ScheduleList items={upcoming} onDelete={(id) => remove.mutate(id)} />
      </section>
    </Screen>
  );
}
