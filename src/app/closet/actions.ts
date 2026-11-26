"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { torontoDay } from "@/lib/time";

// Server actions for the closet. They run with the signed-in user's session, so
// Supabase RLS decides what's allowed (only allowlisted users).

function refresh() {
  revalidatePath("/");
  revalidatePath("/closet");
}

// "I wore this": logs today's wear and sends pieces to the laundry when they're due.
export async function wearItems(formData: FormData) {
  const ids = formData.getAll("item").map(Number).filter(Number.isFinite);
  if (ids.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("wear_items", { item_ids: ids, day: torontoDay(new Date()) });
  if (error) throw new Error(error.message);
  refresh();
}

// Undo a wear logged today (e.g. tapped by mistake).
export async function unwearItem(formData: FormData) {
  const id = Number(formData.get("item"));
  const supabase = await createClient();
  const day = torontoDay(new Date());
  const { data } = await supabase.from("wardrobe_wears").delete().eq("item_id", id).eq("worn_on", day).select("id");
  if (data && data.length > 0) {
    const { data: item } = await supabase.from("wardrobe_items").select("wears_since_wash").eq("id", id).single();
    const n = Math.max(0, (item?.wears_since_wash ?? 1) - 1);
    await supabase.from("wardrobe_items").update({ wears_since_wash: n, in_laundry: false }).eq("id", id);
  }
  refresh();
}

// Flip one piece in or out of the laundry by hand.
export async function toggleLaundry(formData: FormData) {
  const id = Number(formData.get("item"));
  const supabase = await createClient();
  const { data: item } = await supabase.from("wardrobe_items").select("in_laundry").eq("id", id).single();
  const inLaundry = !item?.in_laundry;
  await supabase
    .from("wardrobe_items")
    .update({ in_laundry: inLaundry, ...(inLaundry ? {} : { wears_since_wash: 0 }), updated_at: new Date().toISOString() })
    .eq("id", id);
  refresh();
}

// "Laundry's done": everything in the wash is clean again.
export async function laundryDone() {
  const supabase = await createClient();
  await supabase
    .from("wardrobe_items")
    .update({ in_laundry: false, wears_since_wash: 0, updated_at: new Date().toISOString() })
    .eq("in_laundry", true);
  refresh();
}
