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

  const vevents = root.getAllSubcomponents("vevent");
  // Edited instances of a repeating event ("this event only") override the series.
  const overrides = new Map<string, ICAL.Event>();
  for (const comp of vevents) {
    const ev = new ICAL.Event(comp);
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

  for (const comp of vevents) {
    const ev = new ICAL.Event(comp);
    if (ev.isRecurrenceException()) continue; // handled via its series below
    if (!ev.isRecurring()) {
      push(ev, ev.startDate, ev.endDate);
      continue;
    }
    const it = ev.iterator();
    for (let next = it.next(); next; next = it.next()) {
      if (next.toJSDate() >= to) break;
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

