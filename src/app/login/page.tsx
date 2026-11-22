import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Sign in · cal-os" };

const MESSAGES: Record<string, string> = {
  "not-allowed": "That Google account isn't on the list for cal-os.",
  failed: "Sign-in didn't finish. Try again.",
};

// Server action: ask Supabase for the Google sign-in URL and send the browser there.
async function signInWithGoogle() {
  "use server";
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback`, queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) redirect(`/login?error=failed&reason=${encodeURIComponent(error?.message ?? "no url")}`);
  redirect(data.url);
}

type Props = { searchParams: Promise<{ error?: string; reason?: string }> };

export default function LoginPage({ searchParams }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="tweed px-4 pt-4 pb-5">
        <div className="faceplate mx-auto flex max-w-md items-center justify-center px-5 py-3">
          <span className="font-script text-[34px] leading-none text-oxblood">cal-os</span>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-6 pb-24">
        <div className="ticket flex w-full flex-col items-center gap-4 px-6 pt-6 pb-5 text-center">
          <h1 className="font-slab text-[28px] leading-none font-bold">Staff only</h1>
          <p className="font-type text-sm text-ink-muted">Sign in to see the day&apos;s order.</p>
          <Suspense fallback={null}>
            <ErrorMessage searchParams={searchParams} />
          </Suspense>
          {supabaseConfigured() ? (
            <form action={signInWithGoogle} className="w-full">
              <button type="submit" className="keycap-dark w-full px-4 py-3 font-label text-[14px] font-semibold tracking-[0.16em] uppercase">
                Sign in with Google
              </button>
            </form>
          ) : (
            <p className="font-type text-sm text-stamp">Sign-in isn&apos;t set up yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}

async function ErrorMessage({ searchParams }: Props) {
  const { error, reason } = await searchParams;
  if (!error || !MESSAGES[error]) return null;
  return (
    <p className="font-type text-sm text-stamp">
      {MESSAGES[error]}
      {reason && <span className="block text-[11px] text-ink-muted">({reason})</span>}
    </p>
  );
}
