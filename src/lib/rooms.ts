import type { FeedEvent } from "@/lib/calendar";
import { TIMEZONE, torontoDay, torontoTime } from "@/lib/time";

// Rental rooms come from calendar feeds named CALENDAR_ICS_STR_ROOM_<N>.
// Each event on a room's calendar is a stay; its title says who's staying.

export const ROOM_FEED = /^STR_ROOM_(.+)$/;

export function isRoomFeed(feed: string) {
  return ROOM_FEED.test(feed);
}

export function roomName(feed: string) {
  const m = feed.match(ROOM_FEED);
  return m ? `Room ${m[1].replace(/_/g, " ")}` : feed;
}

export type RoomStatus = {
  room: string;
  current: { guest: string; until: string } | null; // until = checkout, e.g. "Tue 25"
  next: { guest: string; from: string } | null; // from = arrival, e.g. "Thu 27"
};

export type RoomMoment = { kind: "in" | "out"; room: string; guest: string; time: string };

// Date-only strings ("2026-11-25") are calendar dates; format them at noon so no
// time zone can push them onto the wrong day.
function dayLabel(value: string, allDay: boolean) {
  const d = allDay ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return d.toLocaleDateString("en-CA", { timeZone: allDay ? "UTC" : TIMEZONE, weekday: "short", day: "numeric" });
}

function startDay(ev: FeedEvent) {
  return ev.allDay ? ev.start : torontoDay(new Date(ev.start));
}
function endDay(ev: FeedEvent) {
  // All-day ends are exclusive dates, which is exactly the checkout day.
  return ev.allDay ? ev.end : torontoDay(new Date(ev.end));
}

function isCurrent(ev: FeedEvent, now: Date, today: string) {
  if (ev.allDay) return ev.start <= today && today < ev.end;
  return new Date(ev.start) <= now && now < new Date(ev.end);
}

function hasStarted(ev: FeedEvent, now: Date, today: string) {
  return ev.allDay ? ev.start <= today : new Date(ev.start) <= now;
}

export function roomStatuses(events: FeedEvent[], roomFeeds: string[], now: Date): RoomStatus[] {
  const today = torontoDay(now);
  return roomFeeds.map((feed) => {
    const stays = events.filter((e) => e.feed === feed);
    const current = stays.find((e) => isCurrent(e, now, today));
    const next = stays.find((e) => e !== current && !hasStarted(e, now, today));
    return {
      room: roomName(feed),
      current: current ? { guest: current.title, until: dayLabel(current.end, current.allDay) } : null,
      next: next ? { guest: next.title, from: dayLabel(next.start, next.allDay) } : null,
    };
  });
}

// Today's arrivals and departures, for the order ticket.
export function roomMomentsToday(events: FeedEvent[], now: Date): RoomMoment[] {
  const today = torontoDay(now);
  const out: RoomMoment[] = [];
  for (const ev of events) {
    if (!isRoomFeed(ev.feed)) continue;
    const room = roomName(ev.feed);
    if (startDay(ev) === today) {
      out.push({ kind: "in", room, guest: ev.title, time: ev.allDay ? "IN" : torontoTime(new Date(ev.start)) });
    }
    if (endDay(ev) === today && startDay(ev) !== today) {
      out.push({ kind: "out", room, guest: ev.title, time: ev.allDay ? "OUT" : torontoTime(new Date(ev.end)) });
    }
  }
  return out;
}
