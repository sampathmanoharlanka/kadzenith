import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CloudRain, LocateFixed, MapPin } from "lucide-react";

import { WeatherIcon } from "@/components/weather-icon";
import { Skeleton } from "@/components/ui/skeleton";
import type { StateCode } from "@/lib/accounts";
import { shortDate } from "@/lib/format";
import { STATE_LOCATIONS, WEATHER_LABEL, fetchForecast } from "@/lib/weather";

interface Place {
  label: string;
  lat: number;
  lon: number;
}

/** Plain, border-less weather list: icon, date and chance of rain. */
export function WeatherPanel({ stateCode }: { stateCode: StateCode }) {
  const [place, setPlace] = useState<Place>(STATE_LOCATIONS[stateCode] ?? STATE_LOCATIONS.AP);
  const [locating, setLocating] = useState(false);

  const { data, isPending, isError } = useQuery({
    queryKey: ["weather", place.lat.toFixed(2), place.lon.toFixed(2)],
    queryFn: () => fetchForecast(place.lat, place.lon),
    staleTime: 30 * 60 * 1000,
  });

  function locateFarm() {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPlace({ label: "Your farm", lat: coords.latitude, lon: coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  }

  return (
    <section aria-label="Weather" className="px-1">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={locateFarm}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {locating ? (
            <LocateFixed className="size-3.5 animate-pulse" />
          ) : (
            <MapPin className="size-3.5" />
          )}
          {place.label}
        </button>
        {data && (
          <p className="text-xs text-muted-foreground">
            Now <span className="font-semibold text-foreground">{data.current.temperature}°</span>{" "}
            · {WEATHER_LABEL[data.current.kind]}
          </p>
        )}
      </div>

      {isPending && (
        <div className="mt-3 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="size-11 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto h-4 w-12" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <p className="mt-3 text-sm text-muted-foreground">Weather is unavailable right now.</p>
      )}

      {data && (
        <ul className="mt-1">
          {data.days.slice(0, 3).map((day, index) => {
            const kind = index === 0 && !data.current.isDay ? "night" : day.kind;
            return (
              <li key={day.date} className="flex items-center gap-4 py-1.5">
                <WeatherIcon kind={kind} className="size-11 shrink-0" />
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold tabular-nums">
                    {shortDate(day.date)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {WEATHER_LABEL[kind]} · {day.min}°–{day.max}°
                  </p>
                </div>
                <p className="ml-auto flex items-center gap-1 font-display text-lg font-semibold tabular-nums text-sky">
                  <CloudRain className="size-4" />
                  {day.rainChance}%
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
