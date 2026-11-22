import "server-only";
import { createSign } from "node:crypto";
import { cacheLife } from "next/cache";

// Google Keep via the official Keep API (Workspace only). A service account with
// domain-wide delegation acts as Calvin. Its JSON key lives in GOOGLE_KEEP_SA_KEY;
// it is only ever read here, on the server.
//
// The Keep API can list, read and create notes, but cannot edit an existing note.

const KEEP_USER = process.env.GOOGLE_KEEP_USER ?? "calvin@calvinparker.com";
const SCOPE = "https://www.googleapis.com/auth/keep";
const INTAKE_TITLE = "To Do Intake";

type ServiceAccountKey = { client_email: string; private_key: string; token_uri?: string };

export type IntakeItem = { text: string; checked: boolean };
export type Intake = { title: string; items: IntakeItem[]; updated: string | null };

type KeepText = { text?: string };
type KeepListItem = { text?: KeepText; checked?: boolean; childListItems?: KeepListItem[] };
type KeepNote = {
  name: string;
  title?: string;
  updateTime?: string;
  trashed?: boolean;
  body?: { text?: KeepText; list?: { listItems?: KeepListItem[] } };
};

export function hasKeep() {
  return Boolean(process.env.GOOGLE_KEEP_SA_KEY);
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

// Service-account OAuth: sign a JWT (RS256) and swap it for a 1-hour access token.
// Python equivalent: google.oauth2.service_account.Credentials.with_subject(...).
async function accessToken(): Promise<string> {
  const key = JSON.parse(process.env.GOOGLE_KEEP_SA_KEY!) as ServiceAccountKey;
  const tokenUri = key.token_uri ?? "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({ iss: key.client_email, sub: KEEP_USER, scope: SCOPE, aud: tokenUri, iat: now, exp: now + 3600 }),
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(key.private_key, "base64url");

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Keep auth failed (${res.status})`);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function listNotes(token: string): Promise<KeepNote[]> {
  const notes: KeepNote[] = [];
  let pageToken = "";
  for (let page = 0; page < 10; page++) {
    const url = new URL("https://keep.googleapis.com/v1/notes");
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("filter", "trashed = false");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Keep list failed (${res.status})`);
    const data = (await res.json()) as { notes?: KeepNote[]; nextPageToken?: string };
    notes.push(...(data.notes ?? []));
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return notes;
}

function flatten(items: KeepListItem[] = []): IntakeItem[] {
  return items.flatMap((i) => [
    { text: i.text?.text?.trim() ?? "", checked: Boolean(i.checked) },
    ...flatten(i.childListItems),
  ]).filter((i) => i.text);
}

// The GTD intake list ("CALV | PER | ADM | To Do Intake (Getting Things Done)"), cached 5 min.
export async function getIntake(): Promise<{ intake: Intake | null; error: string | null }> {
  "use cache: remote";
  cacheLife({ stale: 60, revalidate: 300, expire: 86_400 });
  if (!hasKeep()) return { intake: null, error: null };
  try {
    const notes = await listNotes(await accessToken());
    const note = notes.find((n) => n.title?.includes(INTAKE_TITLE));
    if (!note) return { intake: null, error: `No Keep note titled "${INTAKE_TITLE}"` };
    const items = note.body?.list
      ? flatten(note.body.list.listItems)
      : (note.body?.text?.text ?? "").split("\n").map((t) => ({ text: t.trim(), checked: false })).filter((i) => i.text);
    return { intake: { title: note.title ?? INTAKE_TITLE, items, updated: note.updateTime ?? null }, error: null };
  } catch (e) {
    return { intake: null, error: e instanceof Error ? e.message : "Keep failed" };
  }
}
