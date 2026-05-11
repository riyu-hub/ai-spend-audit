export default function LoadingAuditPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
      <main className="mx-auto w-full max-w-4xl space-y-6">
        <section className="animate-pulse rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8">
          <div className="h-3 w-36 rounded bg-slate-800" />
          <div className="mt-4 h-8 w-2/3 rounded bg-slate-800" />
          <div className="mt-3 h-4 w-1/2 rounded bg-slate-800" />
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="animate-pulse rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="h-3 w-28 rounded bg-slate-800" />
            <div className="mt-4 h-9 w-36 rounded bg-slate-800" />
          </div>
          <div className="animate-pulse rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="h-3 w-28 rounded bg-slate-800" />
            <div className="mt-4 h-9 w-36 rounded bg-slate-800" />
          </div>
        </section>
      </main>
    </div>
  );
}
