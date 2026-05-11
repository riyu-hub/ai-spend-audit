"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
      <main className="mx-auto w-full max-w-2xl rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Unable to load this audit report
        </h1>
        <p className="mt-2 text-sm text-rose-100/90 sm:text-base">
          Something went wrong while loading this page. Try again in a few moments.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 h-11 rounded-xl bg-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/25"
        >
          Retry
        </button>
      </main>
    </div>
  );
}
