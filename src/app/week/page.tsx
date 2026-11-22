import { Suspense } from "react";
import { connection } from "next/server";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { TicketLines } from "@/components/TicketLines";
import { getWeek } from "@/lib/week";

export const metadata = { title: "Week · cal-os" };

export default function WeekPage() {
  return (
    <div className="flex flex-1 flex-col pb-[96px]">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-5">
        <h1 className="font-slab text-[30px] leading-none font-bold">The week</h1>
        <Suspense fallback={<WeekSkeleton />}>
          <WeekContent />
        </Suspense>
      </main>
      <BottomNav active="/week" />
    </div>
  );
}

async function WeekContent() {
  await connection(); // render per request: "now" changes
  const { days, errors } = await getWeek();
  return (
    <>
      {days.map((d) => (
        <section
          key={d.day}
          aria-labelledby={`day-${d.day}`}
          className={`${d.isToday ? "ticket" : "keycap"} flex flex-col gap-2 px-4 pt-3.5 pb-3`}
        >
          <div className="flex items-baseline justify-between">
            <h2 id={`day-${d.day}`} className="font-label text-[13px] font-semibold tracking-[0.18em] text-oxblood uppercase">
              {d.label}
            </h2>
            {d.lines.length > 0 && (
              <span className="font-type text-[11px] text-ink-muted">
                {d.lines.length} {d.lines.length === 1 ? "thing" : "things"}
              </span>
            )}
          </div>
          {d.lines.length === 0 ? (
            <p className="font-type text-sm text-ink-faint">Open day.</p>
          ) : (
            <TicketLines lines={d.lines} />
          )}
        </section>
      ))}
      {errors.length > 0 && <p className="font-type text-[11px] text-stamp">Couldn&apos;t load: {errors.join(", ")}</p>}
    </>
  );
}

function WeekSkeleton() {
  return (
    <div aria-label="Loading the week" className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="keycap flex flex-col gap-2 p-4">
          <div className="h-4 w-24 bg-tag" />
          <div className="h-4 w-full bg-tag" />
        </div>
      ))}
    </div>
  );
}
