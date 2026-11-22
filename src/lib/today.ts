import "server-only";
import { calendarFeedNames, getCalendarEvents, hasCalendars, type FeedEvent } from "@/lib/calendar";
import { isRoomFeed, roomMomentsToday, roomStatuses, type RoomStatus } from "@/lib/rooms";
import { sample } from "@/lib/sample-data";
import { formatDuration, torontoDay, torontoTime } from "@/lib/time";

export type TicketLine = {
  id: string;
  time: string; // "14:00", "ALL DAY", "IN" or "OUT"
  title: string;
  status: "done" | "now" | "upcoming";
  calendar?: string;
  tag?: string; // e.g. "ROOM 1"
};

export type TodaySchedule = {
  source: "calendar" | "sample";
  lines: TicketLine[];
  upCount: number; // done + in progress
  nextUp: { title: string; in: string } | null;
  calendars: string[];
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

// Sort key: all-day first, then by time; "IN"/"OUT" sit with all-day lines.
function sortKey(line: TicketLine) {
  return /^\d/.test(line.time) ? `1${line.time}` : `0${line.time}`;
}

export async function getTodaySchedule(now: Date): Promise<TodaySchedule> {
  if (!hasCalendars()) {
    const lines = sample.schedule.map((s, i) => ({ id: String(i), time: s.time, title: s.title, status: s.status }));
    return {
      source: "sample",
      lines,
      upCount: lines.filter((l) => l.status !== "upcoming").length,
      nextUp: { title: "Ultimate, Lamport", in: sample.leaveIn },
      calendars: [],
      rooms: [],
      errors: [],
    };
  }

  const { events, errors } = await getCalendarEvents();
  const today = torontoDay(now);

  // Personal calendars: every event today goes on the ticket.
  const personal = events.filter((ev) => !isRoomFeed(ev.feed));
  const todays = personal.filter((ev) => isToday(ev, today));
  const lines: TicketLine[] = todays.map((ev) => {
    if (ev.allDay) return { id: ev.id, time: "ALL DAY", title: ev.title, status: "upcoming", calendar: ev.calendar };
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    const status = end <= now ? "done" : start <= now ? "now" : "upcoming";
    return { id: ev.id, time: torontoTime(start), title: ev.title, status, calendar: ev.calendar };
  });

  // Room calendars: only today's arrivals and departures go on the ticket.
  for (const m of roomMomentsToday(events, now)) {
    lines.push({
      id: `${m.room}|${m.kind}|${m.guest}`,
      time: m.time,
      title: `${m.kind === "in" ? "Check-in" : "Check-out"}: ${m.guest}`,
      status: "upcoming",
      tag: m.room.toUpperCase(),
    });
  }
  lines.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  // From the env vars, so a room with nothing booked still shows as empty.
  const roomFeeds = calendarFeedNames().filter(isRoomFeed).sort();
  const next = todays.find((ev) => !ev.allDay && new Date(ev.start) > now);

  return {
    source: "calendar",
    lines,
    upCount: lines.filter((l) => l.status !== "upcoming").length,
    nextUp: next ? { title: next.title, in: formatDuration(new Date(next.start).getTime() - now.getTime()) } : null,
    calendars: [...new Set(personal.map((e) => e.calendar))],
    rooms: roomStatuses(events, roomFeeds, now),
    errors,
  };
}
