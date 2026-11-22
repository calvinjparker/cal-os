import "server-only";
import { cacheLife } from "next/cache";
export { describe, isSnow } from "./weather-codes";

// Toronto weather from Open-Meteo (free, no API key). Fixed to downtown Toronto
// until the app knows where you are (saved places + phone location).
const LAT = 43.65;
const LON = -79.38;

import type { Hour } from "./weather-codes";
export type { Hour };
export type Weather = { now: { temp: number; feels: number; code: number; wind: number }; hours: Hour[] };

export async function getWeather(): Promise<Weather | null> {
  "use cache: remote";
  cacheLife({ stale: 300, revalidate: 900, expire: 21_600 });

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m" +
    "&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m" +
    "&timezone=America%2FToronto&forecast_days=2";
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const j = await res.json();
    const h = j.hourly;
    return {
      now: {
        temp: j.current.temperature_2m,
        feels: j.current.apparent_temperature,
        code: j.current.weather_code,
        wind: j.current.wind_speed_10m,
      },
      hours: (h.time as string[]).map((time, i) => ({
        time, // local Toronto time, "2026-11-22T19:00"
        temp: h.temperature_2m[i],
        feels: h.apparent_temperature[i],
        rainChance: h.precipitation_probability[i] ?? 0,
        code: h.weather_code[i],
        wind: h.wind_speed_10m[i],
      })),
    };
  } catch {
    return null;
  }
}

