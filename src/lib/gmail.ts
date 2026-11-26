import "server-only";
import { cacheLife } from "next/cache";
import { googleAccessToken } from "@/lib/google";

// Read-only Gmail access (scope gmail.readonly), used only for the Toronto newsletters.
const SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

// Full newsletters arrive via the "(Every Email)" groups for entertainment and music
// (filtered into their Newsletters labels); the abridged digests from the main groups
// are a fallback for anything that hasn't come through in full.
export const NEWSLETTER_QUERY = [
  "deliveredto:cul.ent.newsletters.daily@calvinparker.com",
  "deliveredto:cul.mus.newsletters.daily@calvinparker.com",
  "from:cul.ent.newsletters@calvinparker.com",
  "from:cul.mus.newsletters@calvinparker.com",
]
  .join(" OR ")
  .replace(/^/, "(")
  .concat(") newer_than:3d");

export type Newsletter = { id: string; from: string; subject: string; date: string; text: string };

type Part = { mimeType?: string; body?: { data?: string }; parts?: Part[] };
type Message = { id: string; payload?: Part & { headers?: { name: string; value: string }[] } };

function decode(data?: string) {
  return data ? Buffer.from(data, "base64url").toString("utf8") : "";
}

function findPart(part: Part | undefined, mime: string): string {
  if (!part) return "";
  if (part.mimeType === mime && part.body?.data) return decode(part.body.data);
  for (const p of part.parts ?? []) {
    const found = findPart(p, mime);
    if (found) return found;
  }
  return "";
}

// Good-enough HTML → text: keep link targets (event pages), drop tags and styling.
function htmlToText(html: string) {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, text: string) => `${text} (${href})`)
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

async function gmail<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Gmail ${res.status}: ${(await res.text()).slice(0, 150)}`);
  return (await res.json()) as T;
}

export async function recentNewsletters(maxChars = 15000): Promise<Newsletter[]> {
  "use cache: remote";
  cacheLife({ stale: 600, revalidate: 1800, expire: 86_400 });
  const token = await googleAccessToken(SCOPE);
  const list = await gmail<{ messages?: { id: string }[] }>(
    token,
    `messages?maxResults=15&q=${encodeURIComponent(NEWSLETTER_QUERY)}`,
  );
  const messages = await Promise.all(
    (list.messages ?? []).map((m) => gmail<Message>(token, `messages/${m.id}?format=full`)),
  );
  return messages.map((m) => {
    const header = (name: string) => m.payload?.headers?.find((h) => h.name.toLowerCase() === name)?.value ?? "";
    const plain = findPart(m.payload, "text/plain");
    const text = plain.length > 500 ? plain : htmlToText(findPart(m.payload, "text/html")) || plain;
    return { id: m.id, from: header("from"), subject: header("subject"), date: header("date"), text: text.slice(0, maxChars) };
  });
}
