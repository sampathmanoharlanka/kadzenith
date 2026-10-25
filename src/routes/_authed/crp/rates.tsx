import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import type { WorkType } from "@/lib/booking";
import { formatRupees } from "@/lib/format";
import { workTypesQuery } from "@/lib/queries";
import { workImage } from "@/lib/work-images";

export const Route = createFileRoute("/_authed/crp/rates")({
  head: () => ({
    meta: [
      { title: "Labour rates — KAD CRP" },
      { name: "description", content: "Set the government hourly labour rates farmers pay." },
      { property: "og:title", content: "Labour rates — KAD CRP" },
      { property: "og:description", content: "Hourly labour rates set by the CRP." },
    ],
  }),
  component: RatesPage,
});

function RatesPage() {
  const { data, isPending } = useQuery(workTypesQuery);

  return (
    <Screen title="Labour rates" subtitle="Per hour, as fixed by the government">
      <ul className="space-y-3 pb-6">
        {isPending &&
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20 rounded-3xl" />)}
        {data?.map((type) => (
          <RateRow key={type.id} workType={type} />
        ))}
      </ul>
    </Screen>
  );
}

function RateRow({ workType }: { workType: WorkType }) {
  const profile = useProfile();
  const queryClient = useQueryClient();
  const saved = Number(workType.rate_per_hour);
  const [value, setValue] = useState(String(saved));
  const next = Number(value);
  const changed = value !== "" && next !== saved;
  const valid = Number.isFinite(next) && next > 0 && next <= 2000;

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("work_types")
        .update({ rate_per_hour: next, updated_by: profile.id, updated_at: new Date().toISOString() })
        .eq("id", workType.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(`${workType.name} rate set to ${formatRupees(next)}/hour`);
      void queryClient.invalidateQueries({ queryKey: workTypesQuery.queryKey });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <li className="flex items-center gap-3 rounded-3xl bg-muted p-3">
      <img
        src={workImage(workType.id)}
        alt=""
        loading="lazy"
        width={816}
        height={816}
        className="size-14 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{workType.name}</p>
        <p className="text-xs text-muted-foreground">{workType.name_te}</p>
      </div>
      <div className="relative w-24 shrink-0">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
          ₹
        </span>
        <Input
          type="number"
          inputMode="decimal"
          min={1}
          max={2000}
          aria-label={`${workType.name} rate per hour`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={!valid}
          className="h-11 bg-background pl-7 font-semibold tabular-nums"
        />
      </div>
      <Button
        size="icon"
        variant={changed ? "ink" : "ghost"}
        aria-label="Save rate"
        disabled={!changed || !valid || save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isPending ? <Loader2 className="animate-spin" /> : <Check />}
      </Button>
    </li>
  );
}
