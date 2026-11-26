// Flat clothing drawings from the wardrobe (SVG stored in Supabase, written by us).
// SvgDefs holds the shared patterns the drawings reference; render it once per page.

export function SvgDefs({ html }: { html: string }) {
  if (!html) return null;
  return <div aria-hidden="true" className="h-0 w-0 overflow-hidden" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Drawing({ svg, className = "" }: { svg: string | null; className?: string }) {
  if (!svg) return <div className={`aspect-[26/30] rounded bg-tile-edge/30 ${className}`} />;
  return <div className={`[&>svg]:h-auto [&>svg]:w-full ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}
