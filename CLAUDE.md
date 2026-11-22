# cal-os

Calvin's personal "life OS": a private web app for household and personal life admin, used by a small, fixed set of people.

## Stack

- **App:** Next.js (App Router) + React + TypeScript.
- **Installable web app (PWA):** used primarily on Android, installed from Chrome ("Install app" / "Add to Home screen"). No Play Store. Uses the web app manifest in `src/app/manifest.ts` and icons in `public/` (including a maskable icon for Android), with a mobile-first layout. Add a service worker only when a feature needs one (offline support, push notifications).
- **Database and auth:** Supabase project `cal-os` (Canada Central; RLS on new tables). Sign-in is Google via Supabase Auth; the Google OAuth client lives in the Google Cloud project `cal-os-515506` with an Internal consent screen (calvinparker.com accounts only). `src/proxy.ts` checks the session on every page and API route and only lets in emails listed in `ALLOWED_EMAILS` (currently just calvin@calvinparker.com); it fails closed if Supabase isn't configured. Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `ALLOWED_EMAILS`.
- **Hosting:** Vercel (Hobby plan). Every pull request gets a preview deployment; merging to `main` deploys to production.
- **Code:** GitHub, `calvinjparker/cal-os`.

## Workflow

- Every feature or fix is its own branch and pull request. Keep PRs small and focused.
- Never commit directly to `main` after the initial setup.
- Test changes on the Vercel preview link (including on a phone) before merging.

## Rules

- **Secrets live in environment variables only** (Vercel project settings and a local `.env.local`, which is git-ignored). Never commit keys, tokens, or private URLs. This repo may be public.
- **Private calendar feeds (Google Calendar "secret iCal address") and any API keys are fetched server-side only**, in route handlers or server components. Never expose them to the browser or put them in client bundles.
- Use Supabase Row Level Security on every table so that only signed-in, allowlisted users can read or write data.
- Prefer free data sources that need no API keys where possible.
- Keep dependencies minimal; prefer built-in Next.js and Supabase features over extra libraries.

## Theme

"Restomod": light mode, vintage amp faceplate x smokehouse order ticket. Tokens and component classes (`.tweed`, `.faceplate`, `.ticket`, `.keycap`, `.keycap-dark`, `.tag-recessed`, `.pilot`) live in `src/app/globals.css`. Fonts: Yellowtail (logo), Oswald (labels), Zilla Slab (headings), Courier Prime (typewriter), Inter (body), loaded via a `<link>` in the layout. Design concepts: https://claude.ai/artifact/G1aGMoW9dvDtCmDdGDAwjN

## Features

First version (agreed):
- **Tabs:** Today (`/`), Week (`/week`), Rooms (`/rooms`). Shared header in `src/components/AppHeader.tsx`, ticket rows in `src/components/TicketLines.tsx`.
- **Today screen:** what to wear, today's order ticket (calendar events plus room check-ins/outs), rooms panel, next-up countdown. All real data; no placeholders.
- **Week:** the next 7 days, each day's lines built by `linesForDay` in `src/lib/today.ts` (`src/lib/week.ts`).
- **Calendar:** Google Calendar, read-only via private iCal feeds, fetched server-side and cached a few minutes. One env var per calendar named `CALENDAR_ICS_<EMAIL_WITH_UNDERSCORES>` (e.g. `CALENDAR_ICS_CALVIN_CALVINPARKER_COM`); the label shown comes from the feed's own calendar name. Code: `src/lib/ics.ts` (parsing), `src/lib/calendar.ts` (fetching), `src/lib/today.ts` (today's ticket).
- **Rooms:** Calvin rents rooms (often to pilots). Each room has its own calendar, env var `CALENDAR_ICS_STR_ROOM_<N>`; each event is a stay titled with the guest's name. The Rooms panel shows who's in each room and until when (or who's next); today's check-ins and check-outs go on the ticket. Room stays never appear as ordinary ticket lines. The Rooms tab lists current and upcoming stays (IN/OUT dates, nights), flags back-to-back turnovers, shows nights booked this month, and shows a turnover checklist (ticks saved in the browser's localStorage) when a guest checks out today or tomorrow. Calendar feeds are read from 32 days back to 14 days ahead. Code: `src/lib/rooms.ts`.
- **Weather and what to wear:** Open-Meteo (free, no key), downtown Toronto for now, cached 15 min. `src/lib/weather.ts` fetches; `src/lib/wear.ts` turns the forecast plus today's events into advice (coldest feels-like until your last event ends, rain/snow, wind, games at Lamport, "wear <colour>" in an event title).
- **Keep intake:** Today shows open items from the Google Keep note "CALV | PER | ADM | To Do Intake (Getting Things Done)" via the official Keep API: service account `cal-os-keep@cal-os-515506.iam.gserviceaccount.com` with domain-wide delegation (scope `https://www.googleapis.com/auth/keep`), key in `GOOGLE_KEEP_SA_KEY`, server-only, cached 5 min (`src/lib/keep.ts`). The Keep API can't edit existing notes, so the panel is read-only.
- **To-dos:** Calvin's GTD intake lives in Keep; dated to-dos go on the matching GQueues calendar in Google Calendar.
- **Saved places:** home, Lamport Stadium, etc., matched against the phone's location when the app is open.

Later ideas: quick capture, project pages, leave-soon notifications, household lists, sports schedules.

## Owner notes

- Times are shown on a 12-hour clock in Toronto time ("8:00 PM"). Never show placeholder or sample data as if it were real.
- When summarising people (e.g. email triage), use their name or "they"; don't guess pronouns from a name.
- Merge your own PRs once checked on the preview; Calvin doesn't need to approve each merge.
- Calvin works mostly in Python and SQL; explain TypeScript/React choices briefly when they aren't obvious.
- Calvin's personal site is on Netlify separately; this app is on Vercel so the two don't share limits.
