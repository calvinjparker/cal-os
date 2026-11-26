import { Suspense } from "react";
import { connection } from "next/server";
import { BottomNav } from "@/components/BottomNav";
import { TicketLines } from "@/components/TicketLines";
import { AppHeader } from "@/components/AppHeader";
import { getTodaySchedule, type TodaySchedule } from "@/lib/today";
import { whatToWear } from "@/lib/wear";
import { getWeather } from "@/lib/weather";
import { getIntake } from "@/lib/keep";
import { getPicks, hasPicks } from "@/lib/picks";
import { torontoDay } from "@/lib/time";

export default function Today() {
  return (
    <div className="flex flex-1 flex-col pb-[96px]">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-5">
        <Suspense fallback={<TodaySkeleton />}>
          <TodayContent />
        </Suspense>
        <Suspense fallback={null}>
          <WorthALookPanel />
        </Suspense>
        <Suspense fallback={null}>
          <IntakePanel />
        </Suspense>
      </main>

      <BottomNav active="/" />
    </div>
  );
}

// Everything that comes from the calendars, rendered from a single fetch.
async function TodayContent() {
  await connection(); // render per request: "now" changes
  const [day, weather] = await Promise.all([getTodaySchedule(), getWeather()]);
  const wear = weather ? whatToWear(weather.hours, day.outings, new Date()) : null;
  return (
    <>
      {wear && <WearCard wear={wear} />}
      <OrderTicket day={day} />
      <RoomsPanel day={day} />
      <NextUpTile day={day} />
    </>
  );
}

function WearCard({ wear }: { wear: NonNullable<ReturnType<typeof whatToWear>> }) {
  return (
    <section aria-labelledby="wear-heading" className="keycap flex flex-col gap-1.5 p-3.5">
      <div className="flex items-baseline justify-between">
        <h2 id="wear-heading" className="font-label text-[12px] font-semibold tracking-[0.18em] text-oxblood uppercase">What to wear</h2>
        <span className="font-type text-[11px] text-ink-muted">{wear.window}</span>
      </div>
      <span className="font-slab text-xl leading-tight font-bold">{wear.headline}</span>
      <ul className="flex flex-col gap-0.5 text-sm">
        {wear.items.map((item) => (
          <li key={item}>· {item}</li>
        ))}
      </ul>
    </section>
  );
}

function OrderTicket({ day }: { day: TodaySchedule }) {
  return (
    <section aria-labelledby="order-heading" className="ticket -rotate-[0.6deg] flex flex-col gap-2.5 px-[18px] pt-5 pb-4">
      <span aria-hidden="true" className="absolute -top-[9px] left-1/2 -ml-[34px] h-[18px] w-[68px] rotate-2 bg-[#d6c496]/75" />
      <div className="flex items-center justify-between">
        <h2 id="order-heading" className="font-slab text-[30px] leading-none font-bold">Today&apos;s order</h2>
        {day.lines.length > 0 && (
          <span className="rotate-[4deg] border-[1.5px] border-stamp px-1.5 py-0.5 font-type text-[11px] font-bold text-stamp">
            {day.upCount} OF {day.lines.length} UP
          </span>
        )}
      </div>
      <div className="border-t-[1.5px] border-dashed border-ink" />
      {day.lines.length === 0 ? (
        <p className="font-type text-sm text-ink-muted">Nothing on the calendar today.</p>
      ) : (
        <TicketLines lines={day.lines} />
      )}
      {day.errors.length > 0 && (
        <p className="font-type text-[11px] text-stamp">Couldn&apos;t load: {day.errors.join(", ")}</p>
      )}
    </section>
  );
}

// Who's in each rental room, from the CALENDAR_ICS_STR_ROOM_* calendars.
function RoomsPanel({ day }: { day: TodaySchedule }) {
  if (day.rooms.length === 0) return null;
  return (
    <section aria-labelledby="rooms-heading" className="flex flex-col gap-2.5">
      <h2 id="rooms-heading" className="font-label text-[13px] font-semibold tracking-[0.18em] text-oxblood uppercase">Rooms</h2>
      {day.rooms.map((r) => (
        <div key={r.room} className="keycap flex flex-col gap-1.5 p-3.5">
          <div className="flex items-center justify-between">
            <span className="font-label text-[12px] tracking-[0.16em] uppercase">{r.room}</span>
            <span
              role="img"
              aria-label={r.current ? "Occupied" : "Empty"}
              className={`size-2.5 rounded-full ${r.current ? "pilot" : "bg-[#b9b6ae] shadow-[inset_0_1px_1px_rgb(0_0_0/0.3)]"}`}
            />
          </div>
          {r.current ? (
            <>
              <span className="font-slab text-lg leading-tight font-bold">{r.current.guest}</span>
              <StayDates checkIn={r.current.checkIn} checkOut={r.current.checkOut} />
            </>
          ) : (
            <span className="font-slab text-lg leading-tight font-bold text-ink-faint">Empty</span>
          )}
          {r.next && (
            <div className="mt-1 border-t border-dashed border-tile-edge pt-1.5">
              <span className="font-type text-[11px] text-ink-muted">NEXT: </span>
              <span className="text-sm font-medium">{r.next.guest}</span>
              <StayDates checkIn={r.next.checkIn} checkOut={r.next.checkOut} />
            </div>
          )}
          {!r.current && !r.next && <span className="font-type text-[11px] text-ink-muted">Nothing booked</span>}
        </div>
      ))}
    </section>
  );
}

function StayDates({ checkIn, checkOut }: { checkIn: string; checkOut: string }) {
  return (
    <div className="flex flex-wrap gap-x-3 font-type text-[12px] text-ink-muted">
      <span>IN {checkIn}</span>
      <span>OUT {checkOut}</span>
    </div>
  );
}

function NextUpTile({ day }: { day: TodaySchedule }) {
  return (
    <div className="keycap-dark flex items-center gap-3 p-3">
      <svg aria-hidden="true" width="46" height="46" viewBox="0 0 46 46">
        <circle cx="23" cy="23" r="21" fill="#f4efe3" stroke="#8e8b84" strokeWidth="2" />
        <path d="M8 31 A 17 17 0 1 1 38 31" fill="none" stroke="#d8cbb3" strokeWidth="4" />
        <path d="M8 31 A 17 17 0 0 1 22 6" fill="none" stroke="#a63a2b" strokeWidth="4" />
        <line x1="23" y1="23" x2="20" y2="10" stroke="#231c16" strokeWidth="2" strokeLinecap="round" />
        <circle cx="23" cy="23" r="2.5" fill="#231c16" />
      </svg>
      <div className="flex min-w-0 flex-col">
        <span className="font-type text-[10px] text-[#c9b994]">{day.nextUp ? "NEXT UP IN" : "NEXT UP"}</span>
        <span className="font-slab text-xl font-bold">{day.nextUp ? day.nextUp.in : "Done for today"}</span>
        {day.nextUp && <span className="truncate font-type text-[11px] text-[#c9b994]">{day.nextUp.title}</span>}
      </div>
    </div>
  );
}

// Toronto events Claude picked from the newsletters (refreshed daily).
async function WorthALookPanel() {
  await connection();
  if (!hasPicks()) return null;
  const { picks, error } = await getPicks(torontoDay(new Date()));
  if (picks.length === 0 && !error) return null;
  return (
    <section aria-labelledby="picks-heading" className="ticket flex flex-col gap-2.5 px-[18px] pt-4 pb-4">
      <h2 id="picks-heading" className="font-label text-[12px] font-semibold tracking-[0.18em] text-oxblood uppercase">Worth a look</h2>
      {error && <p className="font-type text-[11px] text-stamp">Couldn&apos;t pick events: {error}</p>}
      <ul className="flex flex-col gap-3">
        {picks.map((p, i) => (
          <li key={i} className="flex flex-col gap-0.5 border-b border-dashed border-tile-edge pb-2.5 last:border-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-2">
              {p.link ? (
                <a href={p.link} target="_blank" rel="noreferrer" className="font-slab text-[17px] leading-tight font-bold underline decoration-tile-edge underline-offset-2">
                  {p.title}
                </a>
              ) : (
                <span className="font-slab text-[17px] leading-tight font-bold">{p.title}</span>
              )}
              <span className={`shrink-0 font-type text-[10px] font-bold ${p.free === "conflict" ? "text-stamp" : "text-ink-muted"}`}>
                {p.free === "free" ? "FREE THEN" : p.free === "conflict" ? "CONFLICT" : ""}
              </span>
            </div>
            <span className="font-type text-[12px] text-ink-muted">
              {p.when}
              {p.where ? ` · ${p.where}` : ""}
            </span>
            <span className="text-sm">{p.why}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Open items on the GTD intake list in Google Keep (read-only: the Keep API can't edit notes).
async function IntakePanel() {
  await connection();
  const { intake, error } = await getIntake();
  if (!intake && !error) return null;
  const open = intake?.items.filter((i) => !i.checked) ?? [];
  return (
    <section aria-labelledby="intake-heading" className="keycap flex flex-col gap-2 p-3.5">
      <div className="flex items-baseline justify-between">
        <h2 id="intake-heading" className="font-label text-[12px] font-semibold tracking-[0.18em] text-oxblood uppercase">Intake</h2>
        <a href="https://keep.google.com/" className="font-type text-[11px] text-ink-muted underline">
          {intake ? `${open.length} open · edit in Keep` : "Keep"}
        </a>
      </div>
      {error && <p className="font-type text-[11px] text-stamp">Couldn&apos;t load Keep: {error}</p>}
      {intake && open.length === 0 && <p className="font-type text-sm text-ink-muted">Inbox zero.</p>}
      {open.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {open.slice(0, 8).map((i, n) => (
            <li key={n}>· {i.text}</li>
          ))}
          {open.length > 8 && <li className="font-type text-[11px] text-ink-muted">+ {open.length - 8} more</li>}
        </ul>
      )}
    </section>
  );
}

function TodaySkeleton() {
  return (
    <section aria-label="Loading today" className="ticket -rotate-[0.6deg] flex flex-col gap-3 px-[18px] pt-5 pb-4">
      <div className="h-7 w-48 bg-tag" />
      <div className="border-t-[1.5px] border-dashed border-ink" />
      <div className="h-4 w-full bg-tag" />
      <div className="h-4 w-5/6 bg-tag" />
    </section>
  );
}
