import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Search, Users } from "lucide-react";

import { EmptyState, Screen, SectionTitle } from "@/components/screen";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { commonSchedulesQuery, farmersQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authed/crp/")({
  head: () => ({
    meta: [
      { title: "Farmers — KAD CRP" },
      { name: "description", content: "Your farmers, their tests and natural farming schedules." },
      { property: "og:title", content: "Farmers — KAD CRP" },
      { property: "og:description", content: "CRP dashboard for natural farming field work." },
    ],
  }),
  component: CrpHome,
});

function CrpHome() {
  const profile = useProfile();
  const [search, setSearch] = useState("");
  const farmers = useQuery(farmersQuery);
  const schedules = useQuery(commonSchedulesQuery);
  const openRequests = useQuery({
    queryKey: ["bookings", "open-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "requested");
      return count ?? 0;
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const term = search.trim().toLowerCase();
  const filtered = (farmers.data ?? []).filter(
    (farmer) =>
      !term ||
      farmer.full_name.toLowerCase().includes(term) ||
      farmer.farmer_code?.toLowerCase().includes(term) ||
      farmer.village?.toLowerCase().includes(term),
  );

  const stats = [
    { label: "Farmers", value: farmers.data?.length },
    { label: "Upcoming tasks", value: schedules.data?.filter((s) => s.scheduled_on >= today).length },
    { label: "Open requests", value: openRequests.data },
  ];

  return (
    <Screen className="space-y-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-primary">CRP · {profile.crp_code}</p>
          <h1 className="truncate text-2xl font-extrabold">Namaste, {profile.full_name.split(" ")[0]}</h1>
          {profile.district && <p className="text-sm text-muted-foreground">{profile.district} district</p>}
        </div>
        <Link to="/profile" aria-label="Your profile">
          <UserAvatar name={profile.full_name} path={profile.avatar_url} className="size-12" />
        </Link>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-muted p-3">
            <p className="font-display text-2xl font-bold tabular-nums">{stat.value ?? "–"}</p>
            <p className="text-[11px] font-medium text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <section>
        <SectionTitle>Your farmers</SectionTitle>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID or village"
            className="pl-10"
          />
        </div>

        {farmers.isPending && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        )}

        {farmers.data && filtered.length === 0 && (
          <EmptyState icon={Users} title={term ? "No farmer matches" : "No farmers yet"}>
            {term ? "Try another name or ID." : "Farmers appear here once they create a KAD account."}
          </EmptyState>
        )}

        <ul className="space-y-2">
          {filtered.map((farmer) => (
            <li key={farmer.id}>
              <Link
                to="/crp/farmers/$farmerId"
                params={{ farmerId: farmer.id }}
                className="flex items-center gap-3 rounded-2xl bg-muted p-3 transition-colors hover:bg-secondary"
              >
                <UserAvatar name={farmer.full_name} path={farmer.avatar_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{farmer.full_name}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {farmer.farmer_code} · {farmer.village}
                  </p>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Screen>
  );
}
