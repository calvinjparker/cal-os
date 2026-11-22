export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-10">
      <header>
        <p className="text-sm text-slate-400">cal-os</p>
        <h1 className="text-3xl font-semibold tracking-tight">Good to see you, Cal.</h1>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-medium">Nothing here yet</h2>
        <p className="mt-1 text-sm text-slate-400">
          Features get added one pull request at a time. Install this app from
          Chrome&apos;s menu with &ldquo;Add to Home screen&rdquo;.
        </p>
      </section>
    </main>
  );
}
