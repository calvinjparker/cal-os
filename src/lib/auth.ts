// Who may use cal-os. ALLOWED_EMAILS is a comma-separated list (Vercel env var).
// If it's missing, nobody gets in: the app fails closed.
export function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowed(email: unknown): boolean {
  return typeof email === "string" && allowedEmails().includes(email.toLowerCase());
}

export function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
