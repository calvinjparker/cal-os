export type Hour = { time: string; temp: number; feels: number; rainChance: number; code: number; wind: number };

// WMO weather codes -> short words.
export function describe(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Mostly clear";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code >= 95) return "Thunderstorms";
  return "—";
}

export function isSnow(code: number) {
  return (code >= 71 && code <= 77) || code === 85 || code === 86;
}
