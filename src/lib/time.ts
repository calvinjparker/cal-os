export const TIMEZONE = "America/Toronto";

// "YYYY-MM-DD" for a moment, as seen in Toronto.
export function torontoDay(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

// "14:00" in Toronto time.
export function torontoTime(d: Date) {
  return d.toLocaleTimeString("en-GB", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" });
}

// "4h 52m" / "35m"
export function formatDuration(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
