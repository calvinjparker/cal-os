import "server-only";
import { cacheLife } from "next/cache";
import { getCalendarEvents } from "@/lib/calendar";
import { recentNewsletters, type Newsletter, type NewsletterGroup } from "@/lib/gmail";
import { hasGoogle } from "@/lib/google";
import { isRoomFeed } from "@/lib/rooms";
import { torontoDate, torontoTime } from "@/lib/time";

// "Worth a look": Claude reads the last few days of Toronto event newsletters
// and picks the handful that fit Calvin and his free time. Computed once per day
// (cached), on Max-plan API credits via ANTHROPIC_API_KEY.

export type Pick = {
  title: string;
  when: string; // e.g. "Sat Nov 28, 8:00 PM"
  where: string;
  why: string;
  free: "free" | "conflict" | "unknown";
  link: string | null;
  source: string;
};

export type Category = {
  key: string;
  label: string;
  groups: readonly NewsletterGroup[];
  kind: "events" | "deals" | "notes";
  brief: string;
};

// What each category's section is for. Events get checked against the calendar.
export const CATEGORIES: Category[] = [
  {
    key: "ent",
    label: "Out & about",
    groups: ["cul.ent.newsletters"],
    kind: "events",
    brief: "Toronto events, food and drink, festivals and things to do. Pick events you'd genuinely leave the house for.",
  },
  {
    key: "mus",
    label: "Live music",
    groups: ["cul.mus.newsletters"],
    kind: "events",
    brief: "Gigs, concerts, on-sale dates and gear news. Pick shows worth going to and on-sales worth catching.",
  },
  {
    key: "acc",
    label: "Deals",
    groups: ["leg.acc.newsletters"],
    kind: "deals",
    brief: "Retail promotions and account emails. Pick only real, time-limited deals or offers worth acting on, with the end date if given. Skip generic marketing.",
  },
  {
    key: "fas",
    label: "Style",
    groups: ["cul.fas.newsletters"],
    kind: "deals",
    brief: "Clothing and fashion newsletters. Pick real sales, drops or pieces worth a look, with the end date if given. Skip generic marketing.",
  },
  {
    key: "nut",
    label: "Food & nutrition",
    groups: ["wel.nut.newsletters"],
    kind: "notes",
    brief: "Nutrition and food newsletters. Pick only genuinely useful items: a recipe worth cooking, a useful tip, or a deal on food. Skip filler.",
  },
];

export type Section = { key: string; label: string; picks: Pick[]; newsletters: number; error: string | null };
export type Picks = { sections: Section[]; day: string };

const MODEL = "claude-sonnet-5-5";

const ABOUT_CALVIN = `Calvin lives in downtown Toronto. Things he's into:
- live music (he plays bass and guitar in a cover band, Rec League), gigs at small and mid-size venues, guitar/bass gear
- ultimate frisbee (plays in TUC and JAM leagues at Lamport Stadium)
- BBQ and smoking meats, good food and drink events, food festivals
- fishing, boats (restoring a fibreglass boat), outdoors
- tech/data meetups (works in analytics)
Not interested in: ska, reggae and rocksteady, kids' events, generic shopping promos, wellness/yoga, anything outside the GTA.`;

export function hasPicks() {
  return hasGoogle() && Boolean(process.env.ANTHROPIC_API_KEY);
}

// Calvin's next 10 days of (non-room) calendar, so Claude can tell when he's free.
async function upcomingSchedule(now: Date): Promise<string> {
  const { events } = await getCalendarEvents();
  const until = now.getTime() + 10 * 86_400_000;
  return events
    .filter((e) => !isRoomFeed(e.feed))
    .filter((e) => {
      const start = e.allDay ? Date.parse(`${e.start}T12:00:00-05:00`) : Date.parse(e.start);
      return start >= now.getTime() - 3_600_000 && start <= until;
    })
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((e) =>
      e.allDay
        ? `${e.start} (all day): ${e.title}`
        : `${torontoDate(new Date(e.start))} ${torontoTime(new Date(e.start))}–${torontoTime(new Date(e.end))}: ${e.title}`,
    )
    .join("\n");
}

async function askClaude(prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}`,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 2500, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 150)}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  return data.content.map((c) => c.text ?? "").join("");
}

export async function getPicks(day: string): Promise<Picks> {
  if (!hasPicks()) return { sections: [], day };
  const sections = await Promise.all(CATEGORIES.map((c) => sectionFor(day, c)));
  return { sections, day };
}

async function sectionFor(day: string, c: Category): Promise<Section> {
  const base = { key: c.key, label: c.label };
  try {
    const newsletters = await recentNewsletters(c.groups);
    if (newsletters.length === 0) return { ...base, picks: [], newsletters: 0, error: null };
    const picks = await choosePicks(day, c.key, newsletters);
    return { ...base, picks, newsletters: newsletters.length, error: null };
  } catch (e) {
    return { ...base, picks: [], newsletters: 0, error: e instanceof Error ? e.message : "failed" };
  }
}

// Cache key is the day, category and the newsletters themselves, so a new newsletter
// gets fresh picks and Claude runs at most once a day per set. Errors throw (never cached).
async function choosePicks(day: string, key: string, newsletters: Newsletter[]): Promise<Pick[]> {
  "use cache: remote";
  cacheLife({ stale: 3600, revalidate: 6 * 3600, expire: 2 * 86_400 });
  const c = CATEGORIES.find((x) => x.key === key)!;
  const now = new Date();
  const schedule = c.kind === "events" ? await upcomingSchedule(now) : "";

  const calendarBit =
    c.kind === "events"
      ? `Calvin's calendar for the next 10 days (Toronto time, 12-hour):
${schedule || "(nothing scheduled)"}

Only pick events between today and 14 days from now. Check each against his calendar: "free" if nothing overlaps, "conflict" if something does (name the clash plainly in "why"), "unknown" if no time is given. Drop events that almost certainly clash with something he has on.`
      : `"when" is the deadline or end date if one is given (e.g. "Ends Sun Nov 29"), otherwise "". "where" is the store or brand. "free" is always "unknown".`;

  const prompt = `Today is ${torontoDate(now)} (${day}), Toronto.

${ABOUT_CALVIN}

This section of his app: ${c.label}. ${c.brief}

${calendarBit}

Be selective: 0 to 3 picks, only things clearly worth his attention; an empty list is fine. Use only details stated in the newsletters; never invent dates, times, places, prices or links. Some are Google Groups "Abridged summary" digests that show only the first lines of each email: use them only when the item itself is visible, and link to the digest's topic if there is no better link.

The "why" lines are read by Calvin himself in his app: address him as "you", never "he", "his", "him" or "Calvin". One short line each.

Reply with only a JSON array, no other text:
[{"title": "...", "when": "...", "where": "...", "why": "...", "free": "free|conflict|unknown", "link": "https://... or null", "source": "newsletter name"}]

${newsletters
  .map((n, i) => `=== Newsletter ${i + 1}: ${n.subject} — from ${n.from} — ${n.date}\n${n.text}`)
  .join("\n\n")}`;

  const text = await askClaude(prompt);
  const json = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
  return (JSON.parse(json) as Pick[]).slice(0, 3);
}
