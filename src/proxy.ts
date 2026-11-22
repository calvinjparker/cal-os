import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAllowed, supabaseConfigured } from "@/lib/auth";

// Runs before every page and API route (see matcher): refreshes the Supabase session
// cookie and sends anyone who isn't a signed-in, allowlisted user to /login.
// Python analogy: a Flask before_request hook that checks the session.

const PUBLIC_PATHS = ["/login", "/auth/callback"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!supabaseConfigured()) {
    // Fail closed: without auth configured, only the login page (which explains) is reachable.
    return isPublic ? NextResponse.next() : redirectTo(request, "/login");
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims() verifies the JWT (and refreshes it when expired) — don't trust getSession() here.
  const { data } = await supabase.auth.getClaims();
  const allowed = isAllowed(data?.claims?.email);

  if (isPublic) return response;
  if (!allowed) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return redirectTo(request, data?.claims ? "/login?error=not-allowed" : "/login");
  }
  return response;
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export const config = {
  // Everything except Next's static files and the files Chrome needs to install the app.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:png|svg|ico|webp|jpg)$).*)"],
};
