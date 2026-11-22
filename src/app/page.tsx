import { BottomNav } from "@/components/BottomNav";
import { Knob } from "@/components/Knob";
import { Screws } from "@/components/Screws";
import { TodayDate } from "@/components/TodayDate";
import { sample } from "@/lib/sample-data";

export default function Today() {
  const { place, conditions, schedule, fitsNow, goals, leaveIn, focusProject } = sample;
  const upCount = schedule.filter((s) => s.status !== "upcoming").length;

  return (
    <div className="flex flex-1 flex-col pb-[96px]">
      {/* Amp header: tweed band with a metal faceplate */}
      <header className="tweed px-4 pt-[max(18px,env(safe-area-inset-top))] pb-5">
        <div className="faceplate mx-auto flex max-w-md flex-col gap-3 px-4 pt-3.5 pb-3">
          <Screws />
          <div className="flex items-center justify-between px-1.5">
            <h1 className="font-script text-[34px] leading-none text-oxblood">cal-os</h1>
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end font-label uppercase">
                <span className="text-[13px] tracking-[0.12em]">{place}</span>
                <span className="text-[10px] tracking-[0.12em] text-ink-muted">{conditions}</span>
              </div>
              <span
                role="img"
                aria-label={`You are at ${place}`}
                className="pilot size-4 border-[3px] border-[#8e8b84]"
              />
            </div>
          </div>
          <div className="h-px bg-[#c9c6be] shadow-[0_1px_0_#fff]" />
          <div className="flex justify-between px-0.5">
            {goals.map((g) => (
              <Knob key={g.id} label={g.name} level={g.level} />
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-5">
        {/* The day as an order ticket */}
        <section aria-labelledby="order-heading" className="ticket -rotate-[0.6deg] flex flex-col gap-2.5 px-[18px] pt-5 pb-4">
          <span aria-hidden="true" className="absolute -top-[9px] left-1/2 -ml-[34px] h-[18px] w-[68px] rotate-2 bg-[#d6c496]/75" />
          <div className="flex justify-between font-type text-[11px] text-ink-muted">
            <span>TICKET</span>
            <span><TodayDate /></span>
          </div>
          <div className="flex items-center justify-between">
            <h2 id="order-heading" className="font-slab text-[30px] leading-none font-bold">Today&apos;s order</h2>
            <span className="rotate-[4deg] border-[1.5px] border-stamp px-1.5 py-0.5 font-type text-[11px] font-bold text-stamp">
              {upCount} OF {schedule.length} UP
            </span>
          </div>
          <div className="border-t-[1.5px] border-dashed border-ink" />
          <ul className="flex flex-col gap-2 font-type text-sm">
            {schedule.map((item) => (
              <li key={item.time} className="flex gap-2.5">
                <span className={`w-[50px] ${item.status === "done" ? "text-ink-faint" : ""} ${item.status === "now" ? "font-bold" : ""}`}>{item.time}</span>
                <span className={`flex-1 ${item.status === "done" ? "text-ink-faint line-through" : ""} ${item.status === "now" ? "font-bold" : ""}`}>{item.title}</span>
                {item.status === "done" && <span className="text-ink-faint" aria-label="done">✓</span>}
                {item.status === "now" && <span className="font-bold text-stamp">NOW</span>}
                {item.status === "upcoming" && item.note && <span className="text-ink-muted">{item.note}</span>}
              </li>
            ))}
          </ul>
        </section>

        {/* Tasks that fit the current gap */}
        <section aria-labelledby="fits-heading" className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <h2 id="fits-heading" className="font-label text-[13px] font-semibold tracking-[0.18em] text-oxblood uppercase">Fits the next 45 min</h2>
            <span className="font-type text-[11px] text-ink-muted">{fitsNow.length} SIDES</span>
          </div>
          {fitsNow.map((task) => (
            <label key={task.id} className="keycap flex min-h-12 items-center gap-3 px-3.5 py-3 text-sm">
              <input type="checkbox" className="m-0 size-5 accent-oxblood" />
              {task.title}
              <span className="tag-recessed ml-auto px-[7px] py-[3px] font-type text-xs text-ink-muted">{task.minutes} MIN</span>
            </label>
          ))}
        </section>

        <div className="flex gap-2.5">
          <div className="keycap-dark flex flex-1 items-center gap-3 p-3">
            <svg role="img" aria-label={`Leave in ${leaveIn}`} width="46" height="46" viewBox="0 0 46 46">
              <circle cx="23" cy="23" r="21" fill="#f4efe3" stroke="#8e8b84" strokeWidth="2" />
              <path d="M8 31 A 17 17 0 1 1 38 31" fill="none" stroke="#d8cbb3" strokeWidth="4" />
              <path d="M8 31 A 17 17 0 0 1 22 6" fill="none" stroke="#a63a2b" strokeWidth="4" />
              <line x1="23" y1="23" x2="20" y2="10" stroke="#231c16" strokeWidth="2" strokeLinecap="round" />
              <circle cx="23" cy="23" r="2.5" fill="#231c16" />
            </svg>
            <div className="flex flex-col">
              <span className="font-type text-[10px] text-[#c9b994]">LEAVE IN</span>
              <span className="font-slab text-xl font-bold">{leaveIn}</span>
            </div>
          </div>
          <div className="keycap flex flex-1 flex-col justify-center gap-0.5 p-3">
            <span className="font-type text-[10px] text-ink-muted uppercase">{focusProject.label}</span>
            <span className="font-slab text-xl font-bold">{focusProject.next}</span>
          </div>
        </div>
      </main>

      <BottomNav active="/" />
    </div>
  );
}
