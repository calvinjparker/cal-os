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

## Features

Not decided yet. Add features here as they're agreed, one line each, with a short note on scope.

## Owner notes

- Calvin works mostly in Python and SQL; explain TypeScript/React choices briefly when they aren't obvious.
- Calvin's personal site is on Netlify separately; this app is on Vercel so the two don't share limits.
