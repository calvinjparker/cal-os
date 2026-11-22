import { NextResponse, type NextRequest } from "next/server";
import { isAllowed } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Google sends the user back here (via Supabase) with a one-time code; swap it for a session.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  if (!code) return fail(request, params.get("error_description") ?? params.get("error") ?? "no code returned");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(request, error.code ?? error.message);

  if (!isAllowed(data.user?.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=not-allowed", request.url));
  }
  return NextResponse.redirect(new URL("/", request.url));
}

function fail(request: NextRequest, reason: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", "failed");
  url.searchParams.set("reason", reason.slice(0, 120));
  return NextResponse.redirect(url);
}
