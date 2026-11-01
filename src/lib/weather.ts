import type { StateCode } from "./accounts";

export type WeatherKind = "sunny" | "partly" | "cloudy" | "fog" | "rain" | "storm" | "night";

export interface DayForecast {
  date: string;
  kind: WeatherKind;
  /** null when the weather service didn't give a value — never guessed. */
  rainChance: number | null;
  rainMm: number | null;
  max: number;
  min: number;
}

export interface Forecast {
  current: { temperature: number; kind: WeatherKind; isDay: boolean; time: string };
  days: DayForecast[];
  /** When we received the data, in ms since epoch. */
  fetchedAt: number;
}

export type PlaceKind = "village" | "gps" | "fallback";

export interface Place {
  label: string;
  lat: number;
  lon: number;
  kind: PlaceKind;
}

const STATE_NAMES: Record<StateCode, string> = {
  AP: "Andhra Pradesh",
  TS: "Telangana",
};

/** Used only when the farmer's village can't be found on the map. */
export const STATE_LOCATIONS: Record<StateCode, Place> = {
  AP: { label: "Vijayawada", lat: 16.5062, lon: 80.648, kind: "fallback" },
  TS: { label: "Warangal", lat: 17.9689, lon: 79.5941, kind: "fallback" },
};

/** Maps WMO weather codes (used by Open-Meteo) to our cartoon icons. */
export function weatherKind(code: number, isDay = true): WeatherKind {
  if (code === 0 || code === 1) return isDay ? "sunny" : "night";
  if (code === 2) return isDay ? "partly" : "night";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 95) return "storm";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  return "cloudy";
}

export const WEATHER_LABEL: Record<WeatherKind, { en: string; te: string }> = {
  sunny: { en: "Sunny", te: "ఎండ" },
  partly: { en: "Partly cloudy", te: "కొంత మేఘావృతం" },
  cloudy: { en: "Cloudy", te: "మేఘావృతం" },
  fog: { en: "Misty", te: "పొగమంచు" },
  rain: { en: "Rain", te: "వర్షం" },
  storm: { en: "Thunderstorm", te: "ఉరుములతో వర్షం" },
  night: { en: "Clear night", te: "నిర్మల రాత్రి" },
};

export interface OpenMeteoResponse {
  current: { time: string; temperature_2m: number; weather_code: number; is_day: number };
  daily: {
    time: string[];
    weather_code: number[];
    precipitation_probability_max?: (number | null)[];
    precipitation_sum?: (number | null)[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

function valueOrNull(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseForecast(data: OpenMeteoResponse, fetchedAt = Date.now()): Forecast {
  const isDay = data.current.is_day === 1;
  return {
    current: {
      temperature: Math.round(data.current.temperature_2m),
      kind: weatherKind(data.current.weather_code, isDay),
      isDay,
      time: data.current.time,
    },
    days: data.daily.time.map((date, i) => ({
      date,
      kind: weatherKind(data.daily.weather_code[i]),
      rainChance: valueOrNull(data.daily.precipitation_probability_max?.[i]),
      rainMm: valueOrNull(data.daily.precipitation_sum?.[i]),
      max: Math.round(data.daily.temperature_2m_max[i]),
      min: Math.round(data.daily.temperature_2m_min[i]),
    })),
    fetchedAt,
  };
}

export async function fetchForecast(lat: number, lon: number, days = 3): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: "temperature_2m,weather_code,is_day",
    daily:
      "weather_code,precipitation_probability_max,precipitation_sum,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: String(days),
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error("Weather is unavailable right now");
  return parseForecast((await response.json()) as OpenMeteoResponse);
}

interface GeocodeResult {
  name: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  admin1?: string;
  admin2?: string;
}

/** Finds the farmer's village inside their own state. Returns null if not on the map. */
export async function findVillage(village: string, stateCode: StateCode): Promise<Place | null> {
  const params = new URLSearchParams({ name: village.trim(), count: "10", language: "en", format: "json" });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
  if (!response.ok) return null;
  const data = (await response.json()) as { results?: GeocodeResult[] };
  const match = data.results?.find(
    (place) => place.country_code === "IN" && place.admin1 === STATE_NAMES[stateCode],
  );
  if (!match) return null;
  return {
    label: [match.name, match.admin2].filter(Boolean).join(", "),
    lat: match.latitude,
    lon: match.longitude,
    kind: "village",
  };
}
