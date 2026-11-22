"use client";

// A turnover checklist for one checkout. Ticks are kept in this browser only
// (localStorage, keyed by the stay), which is fine for a personal to-do like this.
import { useEffect, useState } from "react";

const STEPS = ["Strip bed & wash linens", "Fresh towels", "Bathroom wipe-down", "Vacuum / sweep", "Empty bins", "Restock (TP, soap, water)", "Reset lock code / key"];

export function TurnoverChecklist({ stayId }: { stayId: string }) {
  const key = `turnover:${stayId}`;
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      // Reading browser storage after the first render avoids a server/client mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setDone(JSON.parse(saved));
    } catch {
      /* storage unavailable: start empty */
    }
  }, [key]);

  function toggle(step: string) {
    const next = done.includes(step) ? done.filter((s) => s !== step) : [...done, step];
    setDone(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {STEPS.map((step) => {
        const checked = done.includes(step);
        return (
          <li key={step}>
            <label className="flex cursor-pointer items-center gap-2 font-type text-sm">
              <input type="checkbox" checked={checked} onChange={() => toggle(step)} className="size-4 accent-[#a63a2b]" />
              <span className={checked ? "text-ink-faint line-through" : ""}>{step}</span>
            </label>
          </li>
        );
      })}
      <li className="font-type text-[11px] text-ink-muted">
        {done.length} of {STEPS.length} done
      </li>
    </ul>
  );
}
