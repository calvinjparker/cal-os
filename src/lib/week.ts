import "server-only";
import { cache } from "react";
import { calendarFeedNames, getCalendarEvents } from "@/lib/calendar";
import { isRoomFeed, roomOverviews, type RoomOverview } from "@/lib/rooms";
import { dateLabel, torontoDay } from "@/lib/time";
import { linesForDay, type TicketLine } from "@/lib/today";

export type WeekDay = { day: string; label: string; isToday: boolean; lines: TicketLine[] };

function addDays(day: string, n: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

// The next 7 days (today first), each with every event and room check-in/out.
export const getWeek = cache(async (): Promise<{ days: WeekDay[]; errors: string[] }> => {
  const now = new Date();
  const { events, errors } = await getCalendarEvents();
  const today = torontoDay(now);
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i);
    return {
      day,
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : dateLabel(day),
      isToday: i === 0,
      lines: linesForDay(events, day, now),
    };
  });
  return { days, errors };
});

// Every rental room: current and upcoming stays, turnovers and this month's nights.
export const getRooms = cache(async (): Promise<{ rooms: RoomOverview[]; today: string; errors: string[] }> => {
  const now = new Date();
  const { events, errors } = await getCalendarEvents();
  const roomFeeds = calendarFeedNames().filter(isRoomFeed).sort();
  return { rooms: roomOverviews(events, roomFeeds, now), today: torontoDay(now), errors };
});
