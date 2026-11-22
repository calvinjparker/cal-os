import { describe, isSnow, type Hour } from "./weather-codes";

export type Outing = { title: string; start: string; end: string; location?: string }; // ISO times
export type WearAdvice = { headline: string; items: string[]; window: string };

const round = (n: number) => Math.round(n);

// "2026-11-22T19:00" (Toronto local, from Open-Meteo) for a moment.
function localHourKey(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:00`;
}

function timeLabel(d: Date) {
  return d.toLocaleTimeString("en-US", { timeZone: "America/Toronto", hour: "numeric", minute: "2-digit", hour12: true });
}

function hourLabel(key: string) {
  const h = Number(key.slice(11, 13));
  return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
}

// Works out what to wear for the rest of today: from now until your last event ends
// (or 10 PM if nothing's on), using the coldest "feels like", rain/snow and wind in that span.
export function whatToWear(hours: Hour[], outings: Outing[], now: Date): WearAdvice | null {
  const lastEnd = outings.reduce((max, o) => Math.max(max, new Date(o.end).getTime()), 0);
  // Between midnight and 6 AM, plan for the coming day (from 7 AM), not the hours you're asleep.
  const nowKey = localHourKey(now);
  const fromKey = Number(nowKey.slice(11, 13)) < 6 ? `${nowKey.slice(0, 10)}T07:00` : nowKey;
  const tenPmKey = `${fromKey.slice(0, 10)}T22:00`;
  const threeHoursKey = localHourKey(new Date(now.getTime() + 3 * 3600_000));
  const toKey =
    lastEnd > now.getTime()
      ? localHourKey(new Date(lastEnd))
      : tenPmKey > threeHoursKey ? tenPmKey : threeHoursKey;
  const span = hours.filter((h) => h.time >= fromKey && h.time <= toKey);
  if (span.length === 0) return null;

  const coldest = Math.min(...span.map((h) => h.feels));
  const warmest = Math.max(...span.map((h) => h.feels));
  const rain = Math.max(...span.map((h) => h.rainChance));
  const wind = Math.max(...span.map((h) => h.wind));
  const snowy = span.some((h) => isSnow(h.code));
  const coldestHour = span.find((h) => h.feels === coldest)!;

  const items: string[] = [];
  let headline: string;
  if (coldest >= 20) headline = "T-shirt weather";
  else if (coldest >= 13) headline = "Light layer";
  else if (coldest >= 6) headline = "Jacket";
  else if (coldest >= -4) headline = "Warm jacket";
  else if (coldest >= -12) headline = "Winter coat, toque, gloves";
  else headline = "Full winter gear — it's bitter";

  if (warmest - coldest >= 8) items.push(`Layers: feels like ${round(warmest)}° at the warmest, ${round(coldest)}° by ${hourLabel(coldestHour.time)}`);
  else items.push(`Feels like ${round(coldest)}° to ${round(warmest)}°`);
  if (snowy) items.push("Snow in the forecast — boots");
  else if (rain >= 50) items.push(`${rain}% chance of rain — rain shell or umbrella`);
  else if (rain >= 30) items.push(`${rain}% chance of rain — maybe bring a shell`);
  if (wind >= 30) items.push(`Windy (${round(wind)} km/h) — something windproof`);

  // Indoor games at Lamport (the dome) still mean getting there and back in the cold.
  const games = outings.filter((o) => /ultimate|🥏/i.test(o.title) && new Date(o.end).getTime() > now.getTime());
  if (games.length > 0) {
    const indoor = games.some((g) => /lamport/i.test(g.location ?? "") || /lamport/i.test(g.title));
    items.push(
      indoor
        ? `${games.length === 1 ? "Game" : `${games.length} games`} at Lamport (under the dome): turf shoes, water, light and dark shirts`
        : `${games.length === 1 ? "Game" : `${games.length} games`} outside: cleats, water, dress for ${round(coldest)}°`,
    );
    const colour = games.map((g) => g.title.match(/wear (\w+)/i)?.[1]).find(Boolean);
    if (colour) items.push(`Bring a ${colour.toLowerCase()} shirt`);
  }

  return {
    headline,
    items,
    window: `until ${lastEnd > now.getTime() ? timeLabel(new Date(lastEnd)) : hourLabel(toKey)} · ${describe(coldestHour.code).toLowerCase()}`,
  };
}
