import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
      <main className="mx-auto w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8">
        <p className="text-xs uppercase tracking-wider text-amber-200">Not found</p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          This audit link is invalid or no longer available
        </h1>
        <p className="mt-2 text-sm text-slate-300 sm:text-base">
          The shared report may have been removed or the URL may be incorrect.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-11 items-center rounded-xl border border-white/20 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Back to audit form
        </Link>
      </main>
    </div>
  );
}
