import { Suspense } from "react";
import { Screws } from "@/components/Screws";
import { TodayDate } from "@/components/TodayDate";
import { describe, getWeather } from "@/lib/weather";

// Amp header: tweed band with a metal faceplate, today's date and the weather.
export function AppHeader() {
  return (
    <header className="tweed px-4 pt-[max(18px,env(safe-area-inset-top))] pb-5">
      <div className="faceplate mx-auto flex max-w-md items-center justify-between px-5 py-4">
        <Screws />
        <h1 className="font-script text-[34px] leading-none text-oxblood">cal-os</h1>
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col items-end">
            <span className="font-label text-[15px] tracking-[0.12em]">
              <TodayDate />
            </span>
            <Suspense fallback={<span className="font-label text-[11px] text-ink-muted">&nbsp;</span>}>
              <HeaderWeather />
            </Suspense>
          </div>
          <span aria-hidden="true" className="pilot size-4 border-[3px] border-[#8e8b84]" />
        </div>
      </div>
    </header>
  );
}

async function HeaderWeather() {
  const weather = await getWeather();
  if (!weather) return null;
  return (
    <span className="font-label text-[11px] tracking-[0.12em] text-ink-muted uppercase">
      {Math.round(weather.now.temp)}° · {describe(weather.now.code)}
      {Math.round(weather.now.feels) !== Math.round(weather.now.temp) && ` · feels ${Math.round(weather.now.feels)}°`}
    </span>
  );
}

