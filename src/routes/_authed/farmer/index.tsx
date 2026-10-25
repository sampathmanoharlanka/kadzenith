import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarClock, Copy, FlaskConical } from "lucide-react";
import { toast } from "sonner";

import { MitraChatBox } from "@/components/mitra-chat-box";
import { Screen } from "@/components/screen";
import { UserAvatar } from "@/components/user-avatar";
import { WeatherPanel } from "@/components/weather-panel";
import type { StateCode } from "@/lib/accounts";
import { useProfile } from "@/lib/auth";
import { friendlyDay, formatTime, greeting } from "@/lib/format";
import { findMethod } from "@/lib/natural-farming";
import { farmerSchedulesQuery } from "@/lib/queries";
import { workImage } from "@/lib/work-images";

export const Route = createFileRoute("/_authed/farmer/")({
  head: () => ({
    meta: [
      { title: "Home — KAD Farmer" },
      { name: "description", content: "Weather, labour booking, test results and schedules for your farm." },
      { property: "og:title", content: "Home — KAD Farmer" },
      { property: "og:description", content: "Everything for your natural farm in one place." },
    ],
  }),
  component: FarmerHome,
});

function FarmerHome() {
  const profile = useProfile();
  const today = new Date().toISOString().slice(0, 10);
  const { data: schedules } = useQuery(farmerSchedulesQuery(profile.id));
  const upcoming = (schedules ?? []).filter((item) => item.scheduled_on >= today).slice(0, 2);

  function copyId() {
    if (!profile.farmer_code) return;
    void navigator.clipboard?.writeText(profile.farmer_code);
    toast.success("Farmer ID copied");
  }

  return (
    <Screen className="space-y-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
      {/* Farmer identity */}
      <div className="flex items-center gap-3 rounded-[2rem] bg-leaf-soft py-3 pr-3 pl-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-primary">{greeting()} 🌱</p>
          <p className="truncate font-display text-xl font-bold">{profile.full_name}</p>
          <button
            type="button"
            onClick={copyId}
            className="mt-0.5 flex items-center gap-1.5 font-mono text-xs tracking-wider text-muted-foreground"
          >
            ID: {profile.farmer_code}
            <Copy className="size-3" />
          </button>
        </div>
        <Link to="/profile" aria-label="Your profile">
          <UserAvatar name={profile.full_name} path={profile.avatar_url} className="size-12 ring-4 ring-background" />
        </Link>
      </div>

      <WeatherPanel stateCode={(profile.state_code as StateCode) ?? "AP"} />

      <MitraChatBox />

      {/* Shortcuts: round = labour booking, leaf = LCC & soil test */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          to="/farmer/book"
          className="group relative aspect-square overflow-hidden rounded-full bg-turmeric-soft shadow-soft transition-transform active:scale-[0.97]"
        >
          <img
            src={workImage("sowing")}
            alt=""
            loading="lazy"
            width={816}
            height={816}
            className="absolute inset-0 size-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute inset-x-0 bottom-0 flex flex-col items-center bg-gradient-to-t from-ink/80 to-transparent pt-10 pb-6 text-center text-ink-foreground">
            <span className="font-display text-lg leading-tight font-bold">Book labour</span>
            <span className="text-xs opacity-80">కూలీల బుకింగ్</span>
          </span>
        </Link>

        <Link
          to="/farmer/tests"
          className="shape-leaf flex aspect-square flex-col justify-between bg-gradient-to-br from-lcc-2 to-lcc-5 p-5 text-ink-foreground shadow-soft transition-transform active:scale-[0.97]"
        >
          <FlaskConical className="size-7" />
          <span>
            <span className="block font-display text-lg leading-tight font-bold">
              Green tape (LCC) & soil test
            </span>
            <span className="mt-1 block text-xs opacity-85">Results from your CRP</span>
          </span>
        </Link>
      </div>

      {/* Natural farming schedule */}
      <Link
        to="/farmer/schedules"
        className="block rounded-3xl bg-muted p-5 transition-colors hover:bg-secondary"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-background text-primary">
            <CalendarClock className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold">Natural farming schedule</p>
            <p className="text-xs text-muted-foreground">When to apply Beejamrutham, Jeevamrutham & more</p>
          </div>
          <ArrowRight className="size-5 text-muted-foreground" />
        </div>

        {upcoming.length > 0 && (
          <ul className="mt-4 space-y-2">
            {upcoming.map((item) => {
              const method = findMethod(item.method);
              return (
                <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-background px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${method.tone}`}>
                    {method.nameTe}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {friendlyDay(item.scheduled_on)} · {formatTime(item.scheduled_time)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Link>
    </Screen>
  );
}
