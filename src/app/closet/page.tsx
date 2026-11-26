import { Suspense } from "react";
import { connection } from "next/server";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { Drawing, SvgDefs } from "@/components/Drawing";
import { CATEGORY_ORDER, getWardrobe, type WardrobeItem } from "@/lib/wardrobe";
import { torontoDay } from "@/lib/time";
import { laundryDone, toggleLaundry, unwearItem, wearItems } from "./actions";

export const metadata = { title: "Closet · cal-os" };

export default function ClosetPage() {
  return (
    <div className="flex flex-1 flex-col pb-[96px]">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-5">
        <h1 className="font-slab text-[30px] leading-none font-bold">Closet</h1>
        <Suspense fallback={<div className="keycap h-40" aria-label="Loading closet" />}>
          <ClosetContent />
        </Suspense>
      </main>
      <BottomNav active="/closet" />
    </div>
  );
}

async function ClosetContent() {
  await connection();
  const day = torontoDay(new Date());
  const { items, outfits, svgDefs, wornToday, error } = await getWardrobe(day);
  if (error) return <p className="font-type text-sm text-stamp">Couldn&apos;t load the closet: {error}</p>;
  const worn = new Set(wornToday);
  const laundry = items.filter((i) => i.in_laundry);
  const categories = CATEGORY_ORDER.filter((c) => items.some((i) => i.category === c));

  return (
    <>
      <SvgDefs html={svgDefs} />

      <section className="keycap flex items-center justify-between gap-3 p-3.5">
        <div className="flex flex-col">
          <span className="font-label text-[12px] font-semibold tracking-[0.18em] text-oxblood uppercase">Laundry</span>
          <span className="text-sm">
            {laundry.length === 0 ? "Everything's clean." : `${laundry.length} in the wash: ${laundry.map((i) => i.name).join(", ")}`}
          </span>
        </div>
        {laundry.length > 0 && (
          <form action={laundryDone}>
            <button className="keycap-dark shrink-0 px-3 py-2 font-label text-[11px] tracking-[0.14em] uppercase">Laundry&apos;s done</button>
          </form>
        )}
      </section>

      <p className="font-type text-[12px] text-ink-muted">
        Tap <b>Wore today</b> on what you put on. Shirts, tees and polos go to the wash after one wear; sweaters after 3, jeans
        and chinos after 4; jackets and shoes only when you mark them.
      </p>

      {categories.map((cat) => (
        <section key={cat} className="flex flex-col gap-2">
          <h2 className="font-label text-[12px] font-semibold tracking-[0.18em] text-oxblood uppercase">{cat}</h2>
          <ul className="grid grid-cols-2 gap-2.5">
            {items
              .filter((i) => i.category === cat)
              .map((item) => (
                <ItemCard key={item.id} item={item} wornToday={worn.has(item.id)} />
              ))}
          </ul>
        </section>
      ))}

      {outfits.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-label text-[12px] font-semibold tracking-[0.18em] text-oxblood uppercase">Lookbook</h2>
          {outfits.map((o) => (
            <div key={o.id} className="ticket flex flex-col gap-1 px-4 py-3">
              <span className="font-slab text-[17px] font-bold">{o.name}</span>
              <span className="font-type text-[11px] text-ink-muted">{o.occasion}</span>
              <ul className="text-sm">
                {o.pieces.map((p) => (
                  <li key={p.name}>
                    ·{" "}
                    {p.link ? (
                      <a href={p.link} target="_blank" rel="noreferrer" className="underline decoration-tile-edge underline-offset-2">
                        {p.name}
                      </a>
                    ) : (
                      p.name
                    )}
                    <span className="font-type text-[11px] text-ink-muted"> {p.owned ? "owned" : (p.price ?? "")}</span>
                  </li>
                ))}
              </ul>
              <span className="text-[13px] text-ink-muted">{o.notes}</span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

function ItemCard({ item, wornToday }: { item: WardrobeItem; wornToday: boolean }) {
  const flags = [
    item.status === "on_order" && "On order",
    item.status === "donate" && "Donate?",
    item.in_laundry && "In the wash",
    wornToday && "Worn today",
  ].filter(Boolean) as string[];
  const canWear = item.status !== "on_order";
  return (
    <li className={`keycap flex flex-col gap-1.5 p-2.5 ${item.in_laundry || item.status === "on_order" ? "opacity-60" : ""}`}>
      <Drawing svg={item.svg} />
      <span className="font-slab text-[15px] leading-tight font-bold">{item.name}</span>
      {flags.length > 0 && <span className="font-type text-[10px] font-bold text-stamp uppercase">{flags.join(" · ")}</span>}
      <details className="text-[12px] text-ink-muted">
        <summary className="cursor-pointer font-type text-[11px]">Notes</summary>
        {item.notes}
      </details>
      {canWear && (
        <div className="mt-auto flex gap-1.5">
          <form action={wornToday ? unwearItem : wearItems} className="flex-1">
            <input type="hidden" name="item" value={item.id} />
            <button className="keycap w-full px-1 py-1.5 font-label text-[10px] tracking-[0.1em] uppercase">
              {wornToday ? "Undo" : "Wore today"}
            </button>
          </form>
          <form action={toggleLaundry} className="flex-1">
            <input type="hidden" name="item" value={item.id} />
            <button className="keycap w-full px-1 py-1.5 font-label text-[10px] tracking-[0.1em] uppercase">
              {item.in_laundry ? "Clean" : "To wash"}
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
