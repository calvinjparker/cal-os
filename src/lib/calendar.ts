import "server-only";
import { cacheLife } from "next/cache";
import { eventsInRange, type CalendarEvent } from "@/lib/ics";

export type { CalendarEvent };

// Calendars come from env vars named CALENDAR_ICS_<ANYTHING>, each holding one
// Google Calendar "secret address in iCal format". They're read and fetched
// on the server only, so the private links never reach the browser.

function calendarFeeds(): { key: string; url: string }[] {
  return Object.entries(process.env)
    .filter(([key, value]) => key.startsWith("CALENDAR_ICS_") && value)
    .map(([key, value]) => ({ key, url: value as string }));
}

export function hasCalendars() {
  return calendarFeeds().length > 0;
}

// Fetches every calendar and returns events from yesterday through tomorrow.
// Cached for a few minutes so the app isn't hitting Google on every page view.
export async function getCalendarEvents(): Promise<{ events: CalendarEvent[]; errors: string[] }> {
  "use cache";
  cacheLife("minutes");

  const now = Date.now();
  const from = new Date(now - 36 * 3600_000);
  const to = new Date(now + 48 * 3600_000);

  const results = await Promise.all(
    calendarFeeds().map(async ({ key, url }) => {
      const label = key.replace(/^CALENDAR_ICS_/, "").toLowerCase();
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return { events: eventsInRange(await res.text(), label, from, to), error: null };
      } catch (err) {
        // Report the calendar by its key name only; never log the private URL.
        return { events: [], error: `${label}: ${err instanceof Error ? err.message : "failed"}` };
      }
    }),
  );

  return {
    events: results.flatMap((r) => r.events).sort((a, b) => a.start.localeCompare(b.start)),
    errors: results.flatMap((r) => (r.error ? [r.error] : [])),
  };
}
