import { connection } from "next/server";
import { getIntake, hasKeep } from "@/lib/keep";
import { getCalendarEvents, hasCalendars } from "@/lib/calendar";
import { recentNewsletters } from "@/lib/gmail";

// Signed-in only (proxy.ts guards /api). Reports whether each integration works,
// never the secrets themselves.
export async function GET() {
  await connection();
  const [anthropic, keep, calendar, gmail] = await Promise.all([checkAnthropic(), checkKeep(), checkCalendar(), checkGmail()]);
  return Response.json({ anthropic, keep, calendar, gmail, checkedAt: new Date().toISOString() });
}

async function checkAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "ANTHROPIC_API_KEY not set" };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}`,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 5, messages: [{ role: "user", content: "Reply with: ok" }] }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
    const data = (await res.json()) as { model?: string };
    return { ok: true, model: data.model };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "failed" };
  }
}

async function checkKeep() {
  if (!hasKeep()) return { ok: false, error: "GOOGLE_KEEP_SA_KEY not set" };
  const { intake, error } = await getIntake();
  return error ? { ok: false, error } : { ok: true, openItems: intake?.items.filter((i) => !i.checked).length ?? 0 };
}

async function checkCalendar() {
  if (!hasCalendars()) return { ok: false, error: "no CALENDAR_ICS_* feeds" };
  const { events, errors } = await getCalendarEvents();
  return { ok: errors.length === 0, events: events.length, errors };
}

async function checkGmail() {
  if (!hasKeep()) return { ok: false, error: "GOOGLE_KEEP_SA_KEY not set" };
  try {
    const n = await recentNewsletters(200);
    return { ok: true, newsletters: n.length, subjects: n.slice(0, 5).map((x) => x.subject) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "failed" };
  }
}
