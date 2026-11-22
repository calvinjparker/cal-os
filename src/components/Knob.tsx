// A chicken-head amp knob. `level` is 1-10; the pointer sweeps 270° like a real amp.
export function Knob({ level, label, size = 58 }: { level: number; label: string; size?: number }) {
  const clamped = Math.min(10, Math.max(1, level));
  const angle = -135 + ((clamped - 1) / 9) * 270; // 0° = straight up

  return (
    <div className="flex flex-col items-center gap-1">
      <svg role="img" aria-label={`${label}: ${clamped} of 10`} width={size} height={size} viewBox="0 0 58 58">
        <g fill="#4a453f" fontFamily="Oswald, sans-serif" fontSize="6">
          <text x="8" y="50">1</text>
          <text x="46" y="50">10</text>
          <text x="26" y="7">5</text>
        </g>
        <circle cx="29" cy="31" r="18" fill="#1d1915" stroke="#3a342e" strokeWidth="2" />
        <circle cx="29" cy="31" r="10" fill="#2d2823" />
        <path d="M29 31 L 27 15 L 31 15 Z" fill="#f4efe3" transform={`rotate(${angle} 29 31)`} />
      </svg>
      <span className="font-label text-[10px] tracking-[0.16em] uppercase">{label}</span>
    </div>
  );
}
