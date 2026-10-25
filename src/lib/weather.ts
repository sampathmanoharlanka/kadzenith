import type { StateCode } from "./accounts";

export type WeatherKind = "sunny" | "partly" | "cloudy" | "fog" | "rain" | "storm" | "night";

export interface DayForecast {
  date: string;
  kind: WeatherKind;
  rainChance: number;
  max: number;
  min: number;
}

export interface Forecast {
  current: { temperature: number; kind: WeatherKind; isDay: boolean };
  days: DayForecast[];
}

/** Fallback when we don't have the farmer's GPS location. */
export const STATE_LOCATIONS: Record<StateCode, { label: string; lat: number; lon: number }> = {
  AP: { label: "Vijayawada", lat: 16.5062, lon: 80.648 },
  TS: { label: "Warangal", lat: 17.9689, lon: 79.5941 },
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

export const WEATHER_LABEL: Record<WeatherKind, string> = {
  sunny: "Sunny",
  partly: "Partly cloudy",
  cloudy: "Cloudy",
  fog: "Misty",
  rain: "Rain",
  storm: "Thunderstorm",
  night: "Clear night",
};

interface OpenMeteoResponse {
  current: { temperature_2m: number; weather_code: number; is_day: number };
  daily: {
    time: string[];
    weather_code: number[];
    precipitation_probability_max: (number | null)[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

export async function fetchForecast(lat: number, lon: number, days = 5): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: "temperature_2m,weather_code,is_day",
    daily:
      "weather_code,precipitation_probability_max,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: String(days),
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error("Weather is unavailable right now");
  const data = (await response.json()) as OpenMeteoResponse;

  const isDay = data.current.is_day === 1;
  return {
    current: {
      temperature: Math.round(data.current.temperature_2m),
      kind: weatherKind(data.current.weather_code, isDay),
      isDay,
    },
    days: data.daily.time.map((date, i) => ({
      date,
      kind: weatherKind(data.daily.weather_code[i]),
      rainChance: data.daily.precipitation_probability_max[i] ?? 0,
      max: Math.round(data.daily.temperature_2m_max[i]),
      min: Math.round(data.daily.temperature_2m_min[i]),
    })),
  };
}
