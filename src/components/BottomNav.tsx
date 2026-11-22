import Link from "next/link";

const tabs = [
  { href: "/", label: "Today" },
  { href: "/orders", label: "Orders" },
  { href: "/projects", label: "Projects" },
  { href: "/places", label: "Places" },
];

export function BottomNav({ active }: { active: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 h-[74px] bg-tolex shadow-[inset_0_2px_0_#4a3d31] pb-[env(safe-area-inset-bottom)]">
      <span aria-hidden="true" className="absolute inset-x-2 top-1.5 border-t border-dashed border-[#7a6a55]" />
      <div className="mx-auto flex h-full max-w-md items-center justify-around font-label text-[13px] tracking-[0.16em] uppercase">
        {tabs.map((tab) => {
          const isActive = tab.href === active;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-11 flex-col items-center justify-center gap-1 px-2 ${isActive ? "text-tolex-text" : "text-tolex-muted"}`}
            >
              {isActive && <span aria-hidden="true" className="pilot size-1.5" />}
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
