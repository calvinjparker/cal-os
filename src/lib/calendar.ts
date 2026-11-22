import "server-only";
import { cacheLife } from "next/cache";
import { eventsInRange, type CalendarEvent } from "@/lib/ics";

export type { CalendarEvent };

// A fetched event plus which env var (feed) it came from, e.g. "STR_ROOM_1".
export type FeedEvent = CalendarEvent & { feed: string };

// Calendars come from env vars named CALENDAR_ICS_<ANYTHING>, each holding one
// Google Calendar "secret address in iCal format". They're read and fetched
// on the server only, so the private links never reach the browser.

function calendarFeeds(): { key: string; url: string }[] {
  return Object.entries(process.env)
    .filter(([key, value]) => key.startsWith("CALENDAR_ICS_") && value)
    .map(([key, value]) => ({ key, url: value as string }));
}

// Feed names (env var minus the CALENDAR_ICS_ prefix), e.g. ["CALVIN_CALVINPARKER_COM", "STR_ROOM_1"].
export function calendarFeedNames() {
  return calendarFeeds().map(({ key }) => key.replace(/^CALENDAR_ICS_/, ""));
}

export function hasCalendars() {
  return calendarFeeds().length > 0;
}

// Fetches every calendar and returns events from yesterday through the next two weeks
// (two weeks so the Rooms panel can say who's arriving next).
// Cached for a few minutes so the app isn't hitting Google on every page view.
export async function getCalendarEvents(): Promise<{ events: FeedEvent[]; errors: string[] }> {
  "use cache";
  cacheLife("minutes");

  const now = Date.now();
  const from = new Date(now - 36 * 3600_000);
  const to = new Date(now + 14 * 24 * 3600_000);

  const results: { events: FeedEvent[]; error: string | null }[] = await Promise.all(
    calendarFeeds().map(async ({ key, url }) => {
      const feed = key.replace(/^CALENDAR_ICS_/, "");
      const label = feed.toLowerCase();
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const events = eventsInRange(await res.text(), label, from, to).map((e) => ({ ...e, feed }));
        return { events, error: null };
      } catch (err) {
        // Report the calendar by its key name only; never log the private URL.
        const reason = err instanceof Error && err.name === "TimeoutError" ? "timed out" : err instanceof Error ? err.message : "failed";
        return { events: [], error: `${label}: ${reason}` };
      }
    }),
  );

  return {
    events: results.flatMap((r) => r.events).sort((a, b) => a.start.localeCompare(b.start)),
    errors: results.flatMap((r) => (r.error ? [r.error] : [])),
  };
}
