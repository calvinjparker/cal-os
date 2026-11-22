import "server-only";
import { cache } from "react";
import { calendarFeedNames, getCalendarEvents, type FeedEvent } from "@/lib/calendar";
import { isRoomFeed, roomMomentsToday, roomStatuses, type RoomStatus } from "@/lib/rooms";
import { formatDuration, torontoDay, torontoTime } from "@/lib/time";

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

// cache() makes every section of the page share one result per request,
// so the calendars are fetched once per page load, not once per section.
export const getTodaySchedule = cache(async (): Promise<TodaySchedule> => {
  const now = new Date();
  const { events, errors } = await getCalendarEvents();
  const today = torontoDay(now);

  const personal = events.filter((ev) => !isRoomFeed(ev.feed));
  const todays = personal.filter((ev) => isToday(ev, today));
  const lines: TicketLine[] = todays.map((ev) => {
    const tag = feedTag(ev.feed);
    if (ev.allDay) return { id: ev.id, time: "ALL DAY", sort: "0", title: ev.title, status: "upcoming", tag };
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    const status = end <= now ? "done" : start <= now ? "now" : "upcoming";
    return { id: ev.id, time: torontoTime(start), sort: `1${ev.start}`, title: ev.title, status, tag };
  });

  // Room calendars: only today's arrivals and departures go on the ticket.
  for (const m of roomMomentsToday(events, now)) {
    lines.push({
      id: `${m.room}|${m.kind}|${m.guest}`,
      time: m.time,
      sort: m.sortKey,
      title: `${m.kind === "in" ? "Check-in" : "Check-out"}: ${m.guest}`,
      status: "upcoming",
      tag: m.room.toUpperCase(),
    });
  }
  lines.sort((a, b) => a.sort.localeCompare(b.sort));

  // From the env vars, so a room with nothing booked still shows as empty.
  const roomFeeds = calendarFeedNames().filter(isRoomFeed).sort();
  const next = todays.find((ev) => !ev.allDay && new Date(ev.start) > now);

  return {
    lines,
    upCount: lines.filter((l) => l.status !== "upcoming").length,
    nextUp: next ? { title: next.title, in: formatDuration(new Date(next.start).getTime() - now.getTime()) } : null,
    rooms: roomStatuses(events, roomFeeds, now),
    errors,
  };
});
