import "server-only";
import { createSign } from "node:crypto";

// Google service account (cal-os-keep) with domain-wide delegation, acting as Calvin.
// Its JSON key lives in GOOGLE_KEEP_SA_KEY (server-only). Authorized scopes:
// keep, gmail.readonly.
//
// Python equivalent: google.oauth2.service_account.Credentials(...).with_subject(...).

export const GOOGLE_USER = process.env.GOOGLE_KEEP_USER ?? "calvin@calvinparker.com";

type ServiceAccountKey = { client_email: string; private_key: string; token_uri?: string };

export function hasGoogle() {
  return Boolean(process.env.GOOGLE_KEEP_SA_KEY);
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

// Sign a JWT (RS256) and swap it for a 1-hour access token for the given scope.
export async function googleAccessToken(scope: string): Promise<string> {
  const key = JSON.parse(process.env.GOOGLE_KEEP_SA_KEY!) as ServiceAccountKey;
  const tokenUri = key.token_uri ?? "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({ iss: key.client_email, sub: GOOGLE_USER, scope, aud: tokenUri, iat: now, exp: now + 3600 }),
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
  if (!res.ok) throw new Error(`Google auth failed (${res.status}) for ${scope.split("/").pop()}`);
  return ((await res.json()) as { access_token: string }).access_token;
}
