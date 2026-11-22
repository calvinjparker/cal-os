export const TIMEZONE = "America/Toronto";

// "YYYY-MM-DD" for a moment, as seen in Toronto.
export function torontoDay(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

// "8:00 PM" in Toronto time (12-hour clock).
export function torontoTime(d: Date) {
  return d.toLocaleTimeString("en-US", { timeZone: TIMEZONE, hour: "numeric", minute: "2-digit", hour12: true });
}

// "Sun Nov 22" for a moment, as seen in Toronto.
export function torontoDate(d: Date) {
  return d.toLocaleDateString("en-US", { timeZone: TIMEZONE, weekday: "short", month: "short", day: "numeric" }).replace(",", "");
}

// "Sun Nov 22" for a calendar date string "YYYY-MM-DD" (no time zone shifting).
export function dateLabel(ymd: string) {
  return new Date(`${ymd}T12:00:00Z`)
    .toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" })
    .replace(",", "");
}

// "4h 52m" / "35m"
export function formatDuration(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
