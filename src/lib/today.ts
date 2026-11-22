import "server-only";
import { getCalendarEvents, hasCalendars, type CalendarEvent } from "@/lib/calendar";
import { sample } from "@/lib/sample-data";
import { formatDuration, torontoDay, torontoTime } from "@/lib/time";

export type TicketLine = {
  id: string;
  time: string; // "14:00" or "ALL DAY"
  title: string;
  status: "done" | "now" | "upcoming";
  calendar?: string;
};

export type TodaySchedule = {
  source: "calendar" | "sample";
  lines: TicketLine[];
  upCount: number; // done + in progress
  nextUp: { title: string; in: string } | null;
  calendars: string[];
  errors: string[];
};

function isToday(ev: CalendarEvent, today: string) {
  if (ev.allDay) return ev.start <= today && today < ev.end;
  // Timed events count if any part of them falls on today's Toronto date.
  const startDay = torontoDay(new Date(ev.start));
  const endDay = torontoDay(new Date(new Date(ev.end).getTime() - 1));
  return startDay <= today && today <= endDay;
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
      errors: [],
    };
  }

  const { events, errors } = await getCalendarEvents();
  const today = torontoDay(now);
  const todays = events.filter((ev) => isToday(ev, today));

  const lines: TicketLine[] = todays.map((ev) => {
    if (ev.allDay) return { id: ev.id, time: "ALL DAY", title: ev.title, status: "upcoming", calendar: ev.calendar };
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    const status = end <= now ? "done" : start <= now ? "now" : "upcoming";
    return { id: ev.id, time: torontoTime(start), title: ev.title, status, calendar: ev.calendar };
  });

  const next = todays.find((ev) => !ev.allDay && new Date(ev.start) > now);

  return {
    source: "calendar",
    lines,
    upCount: lines.filter((l) => l.status !== "upcoming").length,
    nextUp: next ? { title: next.title, in: formatDuration(new Date(next.start).getTime() - now.getTime()) } : null,
    calendars: [...new Set(events.map((e) => e.calendar))],
    errors,
  };
}
