import { Suspense } from "react";
import { connection } from "next/server";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { TurnoverChecklist } from "@/components/TurnoverChecklist";
import { dateLabel } from "@/lib/time";
import { getRooms } from "@/lib/week";
import type { RoomOverview, StayRow } from "@/lib/rooms";

export const metadata = { title: "Rooms · cal-os" };

export default function RoomsPage() {
  return (
    <div className="flex flex-1 flex-col pb-[96px]">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-5">
        <h1 className="font-slab text-[30px] leading-none font-bold">Rooms</h1>
        <Suspense fallback={<div className="keycap h-40" aria-label="Loading rooms" />}>
          <RoomsContent />
        </Suspense>
      </main>
      <BottomNav active="/rooms" />
    </div>
  );
}

function addDays(day: string, n: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

async function RoomsContent() {
  await connection();
  const { rooms, today, errors } = await getRooms();
  if (rooms.length === 0) {
    return <p className="font-type text-sm text-ink-muted">No room calendars set up (CALENDAR_ICS_STR_ROOM_*).</p>;
  }
  const tomorrow = addDays(today, 1);
  return (
    <>
      {rooms.map((r) => (
        <RoomCard key={r.room} room={r} today={today} tomorrow={tomorrow} />
      ))}
      {errors.length > 0 && <p className="font-type text-[11px] text-stamp">Couldn&apos;t load: {errors.join(", ")}</p>}
    </>
  );
}

function RoomCard({ room, today, tomorrow }: { room: RoomOverview; today: string; tomorrow: string }) {
  const pct = Math.round((room.nightsThisMonth / room.daysInMonth) * 100);
  // The next checkout today or tomorrow gets a turnover checklist.
  const turnover = room.stays.find((s) => s.outDay === today || s.outDay === tomorrow);
  return (
    <section aria-labelledby={`room-${room.room}`} className="keycap flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between">
        <h2 id={`room-${room.room}`} className="font-label text-[13px] font-semibold tracking-[0.18em] text-oxblood uppercase">
          {room.room}
        </h2>
        <span className="font-type text-[11px] text-ink-muted">
          {room.nightsThisMonth}/{room.daysInMonth} nights this month · {pct}%
        </span>
      </div>
      <div aria-hidden="true" className="h-1.5 w-full bg-tag">
        <div className="h-full bg-oxblood" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>

      {room.stays.length === 0 ? (
        <p className="font-slab text-lg font-bold text-ink-faint">Nothing booked</p>
      ) : (
        <ul className="flex flex-col divide-y divide-dashed divide-tile-edge">
          {room.stays.map((s) => (
            <StayItem key={s.id} stay={s} />
          ))}
        </ul>
      )}

      {turnover && (
        <div className="ticket flex flex-col gap-2 px-3.5 pt-3 pb-3">
          <h3 className="font-label text-[12px] font-semibold tracking-[0.16em] text-oxblood uppercase">
            Turnover · {turnover.outDay === today ? "today" : "tomorrow"} ({turnover.guest} out)
          </h3>
          <TurnoverChecklist stayId={turnover.id} />
        </div>
      )}
    </section>
  );
}

function StayItem({ stay }: { stay: StayRow }) {
  return (
    <li className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <span className="font-slab text-lg leading-tight font-bold">{stay.guest}</span>
        <span className={`shrink-0 font-type text-[11px] ${stay.status === "current" ? "font-bold text-stamp" : "text-ink-muted"}`}>
          {stay.status === "current" ? "IN NOW" : "UPCOMING"}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-3 font-type text-[12px] text-ink-muted">
        <span>IN {stay.checkIn}</span>
        <span>OUT {stay.checkOut}</span>
        <span>
          {stay.nights} {stay.nights === 1 ? "night" : "nights"}
        </span>
      </div>
      {stay.backToBack && (
        <span className="font-type text-[11px] font-bold text-stamp">⚠ Back-to-back: next guest arrives {dateLabel(stay.outDay)}</span>
      )}
    </li>
  );
}
