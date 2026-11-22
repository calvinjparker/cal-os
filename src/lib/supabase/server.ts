import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Supabase client for server components, server actions and route handlers.
// The session lives in cookies; @supabase/ssr reads and refreshes them.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a server component, where cookies are read-only; the proxy refreshes them instead.
        }
      },
    },
  });
}
