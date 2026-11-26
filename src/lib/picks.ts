import "server-only";
import { cacheLife } from "next/cache";
import { getCalendarEvents } from "@/lib/calendar";
import { recentNewsletters, type Newsletter } from "@/lib/gmail";
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

export type Picks = { picks: Pick[]; newsletters: number; error: string | null; day: string };

const MODEL = "claude-sonnet-5-5";

const ABOUT_CALVIN = `Calvin lives in downtown Toronto. Things he's into:
- live music (he plays bass and guitar in a cover band, Rec League), gigs at small and mid-size venues, guitar/bass gear
- ultimate frisbee (plays in TUC and JAM leagues at Lamport Stadium)
- BBQ and smoking meats, good food and drink events, food festivals
- fishing, boats (restoring a fibreglass boat), outdoors
- tech/data meetups (works in analytics)
Not interested in: kids' events, generic shopping promos, wellness/yoga, anything outside the GTA.`;

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
  if (!hasPicks()) return { picks: [], newsletters: 0, error: null, day };
  try {
    const newsletters = await recentNewsletters();
    if (newsletters.length === 0) return { picks: [], newsletters: 0, error: null, day };
    const picks = await choosePicks(day, newsletters);
    return { picks, newsletters: newsletters.length, error: null, day };
  } catch (e) {
    return { picks: [], newsletters: 0, error: e instanceof Error ? e.message : "failed", day };
  }
}

// Cache key is the day plus the newsletters themselves, so a new newsletter arriving
// gets fresh picks, and Claude runs at most once per day per set of newsletters.
// Errors throw (and so are never cached).
async function choosePicks(day: string, newsletters: Newsletter[]): Promise<Pick[]> {
  "use cache: remote";
  cacheLife({ stale: 3600, revalidate: 6 * 3600, expire: 2 * 86_400 });
  {
    const now = new Date();
    const schedule = await upcomingSchedule(now);

    const prompt = `Today is ${torontoDate(now)} (${day}), Toronto.

${ABOUT_CALVIN}

His calendar for the next 10 days (times are Toronto, 12-hour):
${schedule || "(nothing scheduled)"}

Below are Toronto event newsletters from the last few days. Pick the 3 to 5 events Calvin would most want to know about, happening between today and 14 days from now. Prefer specific, dated events over general listings. Skip anything already past. For each pick, check his calendar: "free" if nothing overlaps, "conflict" if something does, "unknown" if the time isn't given. Use only details stated in the newsletters; never invent dates, times, venues or links. Some are Google Groups "Abridged summary" digests that show only the first lines of each email: pick from those too when an event's name and date are visible, using "unknown" for missing times and the digest's link to the topic if there is no event link. Return [] only if there is truly nothing upcoming in the GTA.

Reply with only a JSON array, no other text:
[{"title": "...", "when": "Sat Nov 28, 8:00 PM", "where": "venue, neighbourhood", "why": "one short line on why it fits him", "free": "free|conflict|unknown", "link": "https://... or null", "source": "newsletter name"}]

${newsletters
  .map((n, i) => `=== Newsletter ${i + 1}: ${n.subject} — from ${n.from} — ${n.date}\n${n.text}`)
  .join("\n\n")}`;

    const text = await askClaude(prompt);
    const json = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
    return (JSON.parse(json) as Pick[]).slice(0, 5);
  }
}
