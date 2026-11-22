# cal-os

Calvin's personal "life OS": a private web app for household and personal life admin, used by a small, fixed set of people.

## Stack

- **App:** Next.js (App Router) + React + TypeScript.
- **Installable web app (PWA):** used primarily on Android, installed from Chrome ("Install app" / "Add to Home screen"). No Play Store. Uses the web app manifest in `src/app/manifest.ts` and icons in `public/` (including a maskable icon for Android), with a mobile-first layout. Add a service worker only when a feature needs one (offline support, push notifications).
- **Database and auth:** Supabase (hosted Postgres + Supabase Auth). Only an allowlist of known users can sign in; there is no public sign-up.
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
- **Today screen:** where you are, today's schedule, to-dos that fit the current gap, goal knobs, leave-by countdown. Currently uses placeholder data from `src/lib/sample-data.ts`.
- **Calendar:** Google Calendar, read-only via private iCal feeds, fetched server-side.
- **To-dos:** stored in Supabase, tagged with place and rough duration so Today can match them to free time and location.
- **Saved places:** home, Lamport Stadium, etc., matched against the phone's location when the app is open.

Later ideas: morning brief, quick capture, project pages, leave-soon notifications, weekly review, household lists, sports schedules.

## Owner notes

- Calvin works mostly in Python and SQL; explain TypeScript/React choices briefly when they aren't obvious.
- Calvin's personal site is on Netlify separately; this app is on Vercel so the two don't share limits.
