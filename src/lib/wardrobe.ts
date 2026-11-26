import "server-only";
import { createClient } from "@/lib/supabase/server";

// Calvin's clothes (Supabase wardrobe_* tables, RLS: signed-in allowlisted users only).
// Reads go through the signed-in user's session, so they're never shared or cached across users.

export type WardrobeItem = {
  id: number;
  category: string;
  name: string;
  tags: string[];
  notes: string;
  status: "owned" | "on_order" | "donate";
  svg: string | null;
  sort: number;
  in_laundry: boolean;
  wears_since_wash: number;
  wears_per_wash: number;
};

export type Outfit = {
  id: number;
  name: string;
  occasion: string;
  pieces: { name: string; owned: boolean; link: string | null; price: string | null }[];
  notes: string;
};

export const CATEGORY_ORDER = [
  "Shirts",
  "Tees and polos",
  "Sweaters and layers",
  "Outerwear",
  "Jeans and pants",
  "Shoes",
  "Accessories",
];

export type Wardrobe = {
  items: WardrobeItem[];
  outfits: Outfit[];
  svgDefs: string;
  wornToday: number[];
  error: string | null;
};

export async function getWardrobe(day: string): Promise<Wardrobe> {
  const supabase = await createClient();
  const [items, outfits, defs, wears] = await Promise.all([
    supabase.from("wardrobe_items").select("*").order("sort"),
    supabase.from("wardrobe_outfits").select("*").order("sort"),
    supabase.from("wardrobe_assets").select("value").eq("key", "svg_defs").maybeSingle(),
    supabase.from("wardrobe_wears").select("item_id").eq("worn_on", day),
  ]);
  const error = items.error?.message ?? outfits.error?.message ?? defs.error?.message ?? wears.error?.message ?? null;
  return {
    items: (items.data ?? []) as WardrobeItem[],
    outfits: (outfits.data ?? []) as Outfit[],
    svgDefs: (defs.data?.value as string | undefined) ?? "",
    wornToday: (wears.data ?? []).map((w) => w.item_id as number),
    error,
  };
}

// What you could put on right now: owned (or keep-for-now donate) pieces that aren't in the wash.
export function availableItems(items: WardrobeItem[]) {
  return items.filter((i) => i.status !== "on_order" && !i.in_laundry);
}
