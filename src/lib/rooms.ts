import type { FeedEvent } from "@/lib/calendar";
import { dateLabel, torontoDate, torontoDay, torontoTime } from "@/lib/time";

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
  current: Stay | null;
  next: Stay | null;
};

// checkIn / checkOut are labels like "Sun Nov 22" (plus "3:00 PM" for timed stays).
export type Stay = { guest: string; checkIn: string; checkOut: string };

export type RoomMoment = { kind: "in" | "out"; room: string; guest: string; time: string; sortKey: string };

function stayLabel(value: string, allDay: boolean) {
  if (allDay) return dateLabel(value);
  const d = new Date(value);
  return `${torontoDate(d)}, ${torontoTime(d)}`;
}

function toStay(ev: FeedEvent): Stay {
  return { guest: ev.title, checkIn: stayLabel(ev.start, ev.allDay), checkOut: stayLabel(ev.end, ev.allDay) };
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
      current: current ? toStay(current) : null,
      next: next ? toStay(next) : null,
    };
  });
}

// A day's arrivals and departures ("YYYY-MM-DD", Toronto), for the ticket and the Week view.
export function roomMomentsOn(events: FeedEvent[], today: string): RoomMoment[] {
  const out: RoomMoment[] = [];
  for (const ev of events) {
    if (!isRoomFeed(ev.feed)) continue;
    const room = roomName(ev.feed);
    if (startDay(ev) === today) {
      out.push({ kind: "in", room, guest: ev.title, time: ev.allDay ? "IN" : torontoTime(new Date(ev.start)), sortKey: ev.allDay ? "0" : `1${ev.start}` });
    }
    if (endDay(ev) === today && startDay(ev) !== today) {
      out.push({ kind: "out", room, guest: ev.title, time: ev.allDay ? "OUT" : torontoTime(new Date(ev.end)), sortKey: ev.allDay ? "0" : `1${ev.end}` });
    }
  }
  return out;
}

// ---- Rooms tab: stays, occupancy and turnovers -------------------------------

export type StayRow = Stay & {
  id: string;
  nights: number;
  inDay: string; // "YYYY-MM-DD" (Toronto)
  outDay: string; // "YYYY-MM-DD" (Toronto)
  status: "current" | "upcoming";
  backToBack: boolean; // next guest arrives the day this one leaves
};

export type RoomOverview = {
  room: string;
  stays: StayRow[]; // current + upcoming, in order
  nightsThisMonth: number;
  daysInMonth: number;
};

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

function addDays(day: string, n: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

export function roomOverviews(events: FeedEvent[], roomFeeds: string[], now: Date): RoomOverview[] {
  const today = torontoDay(now);
  const monthStart = `${today.slice(0, 7)}-01`;
  const nextMonth = addDays(`${today.slice(0, 7)}-28`, 4).slice(0, 7) + "-01";
  const daysInMonth = daysBetween(monthStart, nextMonth);

  return roomFeeds.map((feed) => {
    const stays = events
      .filter((e) => e.feed === feed)
      .map((e) => ({ e, inDay: startDay(e), outDay: endDay(e) }))
      .sort((a, b) => a.inDay.localeCompare(b.inDay));

    // Nights booked this month: each night is the date you sleep there (in-day .. out-day - 1).
    let nightsThisMonth = 0;
    for (const s of stays) {
      const from = s.inDay > monthStart ? s.inDay : monthStart;
      const to = s.outDay < nextMonth ? s.outDay : nextMonth;
      if (to > from) nightsThisMonth += daysBetween(from, to);
    }

    const rows: StayRow[] = stays
      .filter((s) => s.outDay > today || isCurrent(s.e, now, today))
      .map((s, i, arr) => ({
        ...toStay(s.e),
        id: s.e.id,
        nights: Math.max(1, daysBetween(s.inDay, s.outDay)),
        inDay: s.inDay,
        outDay: s.outDay,
        status: s.inDay <= today ? "current" : "upcoming",
        backToBack: arr[i + 1]?.inDay === s.outDay,
      }));

    return { room: roomName(feed), stays: rows, nightsThisMonth, daysInMonth };
  });
}
