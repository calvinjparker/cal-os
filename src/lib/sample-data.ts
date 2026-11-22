// Placeholder data so the Today screen has something to show.
// Each piece gets replaced by a real source in its own PR:
// calendar -> Google Calendar feed, tasks/goals -> Supabase, place -> saved places + location.

export type ScheduleItem = { time: string; title: string; status: "done" | "now" | "upcoming"; note?: string };
export type Task = { id: string; title: string; minutes: number };
export type Goal = { id: string; name: string; level: number }; // level 1-10

export const sample = {
  place: "Home",
  conditions: "2° · low wind",
  schedule: [
    { time: "10:00", title: "Groceries run", status: "done" },
    { time: "14:00", title: "Boat shop: stringers", status: "now" },
    { time: "19:30", title: "Ultimate, Lamport", status: "upcoming", note: "19:05" },
  ] satisfies ScheduleItem[],
  fitsNow: [
    { id: "t1", title: "Trim and rub the brisket", minutes: 30 },
    { id: "t2", title: "Restring the guitar", minutes: 20 },
  ] satisfies Task[],
  goals: [
    { id: "boat", name: "Boat", level: 4 },
    { id: "bass", name: "Bass", level: 7 },
    { id: "fishing", name: "Fishing", level: 2 },
    { id: "smoker", name: "Smoker", level: 5 },
  ] satisfies Goal[],
  leaveIn: "4h 52m",
  focusProject: { label: "Low and slow · boat", next: "Stringers next" },
};
