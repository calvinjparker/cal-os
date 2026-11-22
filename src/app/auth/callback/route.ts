import { NextResponse, type NextRequest } from "next/server";
import { isAllowed } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Google sends the user back here (via Supabase) with a one-time code; swap it for a session.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login?error=failed", request.url));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=failed", request.url));

  if (!isAllowed(data.user?.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=not-allowed", request.url));
  }
  return NextResponse.redirect(new URL("/", request.url));
}
