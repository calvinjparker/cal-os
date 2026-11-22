import "server-only";
import { cache } from "react";
import { calendarFeedNames, getCalendarEvents, type FeedEvent } from "@/lib/calendar";
import { isRoomFeed, roomMomentsOn, roomStatuses, type RoomStatus } from "@/lib/rooms";
import { formatDuration, torontoDay, torontoTime } from "@/lib/time";
import type { Outing } from "@/lib/wear";

export type TicketLine = {
  id: string;
  time: string; // "8:00 PM", "ALL DAY", "IN" or "OUT"
  sort: string; // sortable key: all-day/room lines first, then by start time
  title: string;
  status: "done" | "now" | "upcoming";
  tag?: string; // e.g. "ROOM 1", "TUC"
};

export type TodaySchedule = {
  lines: TicketLine[];
  upCount: number; // done + in progress
  nextUp: { title: string; in: string } | null;
  rooms: RoomStatus[];
  outings: Outing[]; // today's timed events, for what-to-wear
  errors: string[];
};

function isToday(ev: FeedEvent, today: string) {
  if (ev.allDay) return ev.start <= today && today < ev.end;
  // Timed events count if any part of them falls on today's Toronto date.
  const startDay = torontoDay(new Date(ev.start));
  const endDay = torontoDay(new Date(new Date(ev.end).getTime() - 1));
  return startDay <= today && today <= endDay;
}

// Your own calendars (env var named after an email, e.g. CALVIN_CALVINPARKER_COM)
// get no tag; others get a short one, e.g. TUC_FLIGHT_CLUB -> "TUC".
function feedTag(feed: string) {
  if (/_(COM|CA|ORG|NET)$/.test(feed)) return undefined;
  return feed.split("_")[0];
}

// Every line for one Toronto date: your events (with a tag for non-personal calendars)
// plus room check-ins and check-outs. Shared by Today and the Week view.
export function linesForDay(events: FeedEvent[], day: string, now: Date): TicketLine[] {
  const lines: TicketLine[] = events
    .filter((ev) => !isRoomFeed(ev.feed) && isToday(ev, day))
    .map((ev) => {
      const tag = feedTag(ev.feed);
      if (ev.allDay) return { id: ev.id, time: "ALL DAY", sort: "0", title: ev.title, status: "upcoming" as const, tag };
      const start = new Date(ev.start);
      const end = new Date(ev.end);
      const status = end <= now ? "done" : start <= now ? "now" : "upcoming";
      return { id: ev.id, time: torontoTime(start), sort: `1${ev.start}`, title: ev.title, status, tag };
    });
  for (const m of roomMomentsOn(events, day)) {
    lines.push({
      id: `${m.room}|${m.kind}|${m.guest}`,
      time: m.time,
      sort: m.sortKey,
      title: `${m.kind === "in" ? "Check-in" : "Check-out"}: ${m.guest}`,
      status: "upcoming",
      tag: m.room.toUpperCase(),
    });
  }
  return lines.sort((a, b) => a.sort.localeCompare(b.sort));
}

// cache() makes every section of the page share one result per request,
// so the calendars are fetched once per page load, not once per section.
export const getTodaySchedule = cache(async (): Promise<TodaySchedule> => {
  const now = new Date();
  const { events, errors } = await getCalendarEvents();
  const today = torontoDay(now);

  const personal = events.filter((ev) => !isRoomFeed(ev.feed));
  const todays = personal.filter((ev) => isToday(ev, today));
  const lines = linesForDay(events, today, now);

  // From the env vars, so a room with nothing booked still shows as empty.
  const roomFeeds = calendarFeedNames().filter(isRoomFeed).sort();
  const next = todays.find((ev) => !ev.allDay && new Date(ev.start) > now);

  return {
    lines,
    upCount: lines.filter((l) => l.status !== "upcoming").length,
    nextUp: next ? { title: next.title, in: formatDuration(new Date(next.start).getTime() - now.getTime()) } : null,
    rooms: roomStatuses(events, roomFeeds, now),
    outings: todays
      .filter((ev) => !ev.allDay)
      .map((ev) => ({ title: ev.title, start: ev.start, end: ev.end, location: ev.location })),
    errors,
  };
});
