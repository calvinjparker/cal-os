import { BottomNav } from "@/components/BottomNav";

// Placeholder for tabs that haven't been built yet, so the nav never 404s.
export function ComingSoon({ title, href, blurb }: { title: string; href: string; blurb: string }) {
  return (
    <div className="flex flex-1 flex-col pb-[96px]">
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-10">
        <section className="ticket flex flex-col gap-3 px-[18px] py-5">
          <h1 className="font-slab text-3xl font-bold">{title}</h1>
          <div className="border-t-[1.5px] border-dashed border-ink" />
          <p className="font-type text-sm text-ink-muted">{blurb}</p>
        </section>
      </main>
      <BottomNav active={href} />
    </div>
  );
}
