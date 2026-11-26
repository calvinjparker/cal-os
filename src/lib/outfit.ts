import "server-only";
import { cacheLife } from "next/cache";
import { askClaude, hasPicks } from "@/lib/picks";
import { torontoTime } from "@/lib/time";
import type { Outing, WearAdvice } from "@/lib/wear";
import type { WardrobeItem } from "@/lib/wardrobe";

// Today's outfit: Claude picks from the clean pieces you own, for today's weather and plans.

export type OutfitPick = { ids: number[]; why: string };

type Piece = Pick<WardrobeItem, "id" | "name" | "category" | "tags" | "notes">;

export function hasOutfitPicker() {
  return hasPicks(); // needs ANTHROPIC_API_KEY (and Google for the rest of the app)
}

export async function pickOutfit(
  day: string,
  available: WardrobeItem[],
  wear: WearAdvice,
  outings: Outing[],
): Promise<OutfitPick> {
  const pieces: Piece[] = available.map(({ id, name, category, tags, notes }) => ({ id, name, category, tags, notes }));
  const weather = [wear.headline, ...wear.items, wear.window].join("; ");
  const plans =
    outings.map((o) => `${torontoTime(new Date(o.start))}–${torontoTime(new Date(o.end))}: ${o.title}${o.location ? ` @ ${o.location}` : ""}`).join("\n") ||
    "(nothing scheduled)";
  return choose(day, pieces, weather, plans);
}

// Cached per day + what's clean + weather + plans, so it reruns only when one of those changes.
async function choose(day: string, pieces: Piece[], weather: string, plans: string): Promise<OutfitPick> {
  "use cache: remote";
  cacheLife({ stale: 1800, revalidate: 3 * 3600, expire: 86_400 });

  const prompt = `Pick one outfit for Calvin to wear today (${day}) in downtown Toronto, from clothes he owns that are clean.

Weather for the rest of his day: ${weather}

His plans today:
${plans}

Rules:
- Use only items from the list, by id. One top (shirt, tee or polo), one bottom, shoes; add a sweater or layer and outerwear when the weather calls for it; a belt with chinos, jeans or dress shoes.
- Dress for the coldest "feels like" in the window, rain/snow and wind. Respect each item's notes about what it pairs with and what to avoid.
- Match the day: smarter for dinners, meetings or dates; practical for errands; if he has an ultimate game, the outfit is for getting there and back (he brings game gear separately). For a gig, something he'd play bass in.
- Avoid gym-only and work-only pieces unless that's the day, and skip anything tagged "Don't like it" / "Don't love it" unless nothing else works.

Reply with only JSON, no other text:
{"ids": [item ids], "why": "one short line to Calvin, written as \\"you\\", on why this works today"}

Clean items (JSON):
${JSON.stringify(pieces)}`;

  const text = await askClaude(prompt);
  const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as OutfitPick;
  const valid = new Set(pieces.map((p) => p.id));
  return { ids: parsed.ids.filter((id) => valid.has(id)), why: parsed.why };
}
