import type { TicketLine } from "@/lib/today";

// The typewritten lines on an order ticket: time, optional tag (ROOM 1, TUC), title, status.
export function TicketLines({ lines }: { lines: TicketLine[] }) {
  return (
    <ul className="flex flex-col gap-2 font-type text-sm">
      {lines.map((line) => {
        const done = line.status === "done";
        const now = line.status === "now";
        return (
          <li key={line.id} className="flex gap-2.5">
            <span className={`w-[72px] shrink-0 ${done ? "text-ink-faint" : ""} ${now ? "font-bold" : ""}`}>{line.time}</span>
            <span className={`flex-1 ${done ? "text-ink-faint line-through" : ""} ${now ? "font-bold" : ""}`}>
              {line.tag && <span className="mr-1.5 bg-tolex px-1 py-px text-[10px] text-tolex-text">{line.tag}</span>}
              {line.title}
            </span>
            {done && <span className="text-ink-faint" aria-label="done">✓</span>}
            {now && <span className="font-bold text-stamp">NOW</span>}
          </li>
        );
      })}
    </ul>
  );
}
