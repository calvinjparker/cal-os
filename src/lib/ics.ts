import ICAL from "ical.js";

export type CalendarEvent = {
  id: string;
  calendar: string; // the calendar's own name from Google, e.g. "calvin@calvinparker.com"
  title: string;
  start: string; // ISO timestamp, or "YYYY-MM-DD" for all-day events
  end: string; // ISO timestamp, or "YYYY-MM-DD" (exclusive) for all-day events
  allDay: boolean;
  location?: string;
};

// Parse one .ics file and return every event occurrence that overlaps [from, to).
export function eventsInRange(ics: string, fallbackName: string, from: Date, to: Date): CalendarEvent[] {
  const root = new ICAL.Component(ICAL.parse(ics));
  for (const tz of root.getAllSubcomponents("vtimezone")) {
    ICAL.TimezoneService.register(tz);
  }
  const calendarName = (root.getFirstPropertyValue("x-wr-calname") as string | null) ?? fallbackName;

  // Big calendars hold years of one-off events. Drop the ones that clearly ended
  // before the window by reading the raw date text, before doing any real parsing.
  const cutoff = new Date(from.getTime() - 2 * 86_400_000).toISOString().slice(0, 10);
  const vevents = root.getAllSubcomponents("vevent").filter((comp) => {
    if (rawProp(comp, "rrule") || rawProp(comp, "recurrence-id")) return true;
    const end = rawProp(comp, "dtend") ?? rawProp(comp, "dtstart");
    return !end || end.slice(0, 10) >= cutoff;
  });

  // Edited instances of a repeating event ("this event only") override the series.
  const events = vevents.map((comp) => new ICAL.Event(comp));
  const overrides = new Map<string, ICAL.Event>();
  for (const ev of events) {
    if (ev.isRecurrenceException()) {
      overrides.set(`${ev.uid}|${ev.recurrenceId.toUnixTime()}`, ev);
    }
  }

  const out: CalendarEvent[] = [];
  const tz = "America/Toronto";
  const fromDay = from.toLocaleDateString("en-CA", { timeZone: tz });
  const toDay = to.toLocaleDateString("en-CA", { timeZone: tz });

  const push = (ev: ICAL.Event, start: ICAL.Time, end: ICAL.Time) => {
    if ((ev.component.getFirstPropertyValue("status") as string | null)?.toUpperCase() === "CANCELLED") return;
    if (start.isDate) {
      // All-day events are calendar dates, not moments: compare as Toronto dates.
      const sDay = start.toString();
      const eDay = end.toString();
      if (eDay <= fromDay || sDay > toDay) return;
      out.push({
        id: `${ev.uid}|${sDay}`,
        calendar: calendarName,
        title: ev.summary || "(no title)",
        start: sDay,
        end: eDay,
        allDay: true,
        location: ev.location || undefined,
      });
      return;
    }
    const s = start.toJSDate();
    const e = end.toJSDate();
    if (e <= from || s >= to) return;
    out.push({
      id: `${ev.uid}|${s.toISOString()}`,
      calendar: calendarName,
      title: ev.summary || "(no title)",
      start: s.toISOString(),
      end: e.toISOString(),
      allDay: false,
      location: ev.location || undefined,
    });
  };

  for (const ev of events) {
    const comp = ev.component;
    if (ev.isRecurrenceException()) continue; // handled via its series below
    if (!ev.isRecurring()) {
      push(ev, ev.startDate, ev.endDate);
      continue;
    }
    // Skip series that ended before the window.
    const rrule = comp.getFirstPropertyValue("rrule") as ICAL.Recur | null;
    if (rrule?.until && rrule.until.toJSDate() < from) continue;

    // Occurrences that end before the window are skipped cheaply; only ones
    // near the window get their full details worked out.
    const durationMs = ev.endDate.toJSDate().getTime() - ev.startDate.toJSDate().getTime();
    const fromMs = from.getTime();
    const it = ev.iterator();
    for (let next = it.next(); next; next = it.next()) {
      const startMs = next.toJSDate().getTime();
      if (startMs >= to.getTime()) break;
      if (startMs + durationMs + 86_400_000 < fromMs) continue;
      const override = overrides.get(`${ev.uid}|${next.toUnixTime()}`);
      if (override) {
        push(override, override.startDate, override.endDate);
      } else {
        const occ = ev.getOccurrenceDetails(next);
        push(ev, occ.startDate, occ.endDate);
      }
    }
  }
  return out;
}


// A property's raw value as written in the file (jCal), e.g. "2020-01-10T15:00:00Z",
// without building ical.js objects.
function rawProp(comp: ICAL.Component, name: string): string | undefined {
  const props = comp.jCal[1] as unknown[][];
  const p = props.find((x) => x[0] === name);
  if (!p) return undefined;
  const v = p[3];
  return typeof v === "string" ? v : v ? JSON.stringify(v) : undefined;
}
