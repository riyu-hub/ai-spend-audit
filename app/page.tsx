"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  buildAuditRecommendations,
  type AuditRecommendation,
  type SpendFormValues,
} from "@/lib/audit-engine";

type SummaryState = {
  text: string;
  source: "ai" | "fallback";
};

type ToastState = {
  id: number;
  type: "success" | "error" | "info";
  message: string;
};

const STORAGE_KEY = "ai-spend-multistep-form";

const steps = ["Tool", "Billing", "Team & Use Case"] as const;

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function buildTrendSeries(monthlySpend: number, monthlySavings: number) {
  const safeSpend = Math.max(monthlySpend || 0, 1000);
  const optimizedSpend = Math.max(safeSpend - monthlySavings, 0);
  return [
    Math.round(safeSpend * 1.02),
    Math.round(safeSpend * 1.01),
    safeSpend,
    Math.round((safeSpend + optimizedSpend) / 2),
    optimizedSpend,
    Math.round(optimizedSpend * 0.98),
  ];
}

function buildPolylinePoints(values: number[], width: number, height: number) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

function buildFallbackSummary(
  data: SpendFormValues,
  recommendations: AuditRecommendation[],
  totalMonthlySavings: number,
  totalAnnualSavings: number,
) {
  const topRecommendation = recommendations[0];
  if (!topRecommendation) {
    return `Your ${data.toolName} spend profile on the ${data.plan} plan appears mostly right-sized for a ${data.teamSize} team. No high-confidence cost optimizations were triggered in this ruleset, so the recommended action is to keep baseline monitoring and alerting in place to prevent new drift.`;
  }

  return `Your ${data.toolName} setup on the ${data.plan} plan shows an estimated savings opportunity of ${currency.format(totalMonthlySavings)} per month (${currency.format(totalAnnualSavings)} annually). Prioritize "${topRecommendation.title}" first because it produces the largest immediate financial impact while reducing recurring spend risk for your ${data.teamSize} team.`;
}

export default function Home() {
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<AuditRecommendation[]>([]);
  const [auditInput, setAuditInput] = useState<SpendFormValues | null>(null);
  const [summary, setSummary] = useState<SummaryState | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [publicReportId, setPublicReportId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const {
    register,
    control,
    reset,
    trigger,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SpendFormValues>({
    defaultValues: {
      toolName: "",
      plan: "",
      monthlySpend: undefined,
      seats: undefined,
      teamSize: "",
      useCase: "",
    },
    mode: "onTouched",
  });

  const values = useWatch({ control });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        reset(JSON.parse(saved));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, [reset])
    
    
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  }, [values, hydrated]);

  const pushToast = useCallback((type: ToastState["type"], message: string) => {
    // Move these inside the function body so they don't run during render
    const id = Date.now() + Math.floor(Math.random() * 1000);
    
    setToasts((current) => [...current, { id, type, message }]);
    
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3500);
  }, []); // Empty dependency array ensures stability
  const nextStep = async () => {
    const fieldsPerStep: (keyof SpendFormValues)[][] = [
      ["toolName", "plan"],
      ["monthlySpend", "seats"],
      ["teamSize", "useCase"],
    ];
    const valid = await trigger(fieldsPerStep[step]);
    if (valid) setStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const onSubmit = async (data: SpendFormValues) => {
    const recommendations = buildAuditRecommendations(data);
    const totalMonthly = recommendations.reduce(
      (sum, item) => sum + item.monthlySavings,
      0,
    );
    const totalAnnual = recommendations.reduce((sum, item) => sum + item.annualSavings, 0);
    const fallbackSummary = buildFallbackSummary(
      data,
      recommendations,
      totalMonthly,
      totalAnnual,
    );

    setResults(recommendations);
    setAuditInput(data);
    setSubmitted(true);
    setSummary(null);
    setIsSummaryLoading(true);
    localStorage.removeItem(STORAGE_KEY);

    try {
      const response = await fetch("/api/personalized-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formData: data,
          recommendations,
          totalMonthlySavings: totalMonthly,
          totalAnnualSavings: totalAnnual,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate AI summary");
      }

      const payload = (await response.json()) as { summary?: string };
      if (!payload.summary) {
        throw new Error("Missing summary text");
      }

      setSummary({ text: payload.summary, source: "ai" });
      pushToast("success", "AI summary generated successfully.");
    } catch {
      setSummary({ text: fallbackSummary, source: "fallback" });
      pushToast(
        "info",
        "AI summary provider unavailable. Showing fallback financial summary.",
      );
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const totalMonthlySavings = results.reduce(
    (sum, item) => sum + item.monthlySavings,
    0,
  );
  const totalAnnualSavings = results.reduce(
    (sum, item) => sum + item.annualSavings,
    0,
  );
  const monthlySpend = Math.max(auditInput?.monthlySpend || 0, 0);
  const optimizedMonthlySpend = Math.max(monthlySpend - totalMonthlySavings, 0);
  const savingsRate = monthlySpend > 0 ? (totalMonthlySavings / monthlySpend) * 100 : 0;
  const trendSeries = buildTrendSeries(monthlySpend, totalMonthlySavings);
  const trendPoints = buildPolylinePoints(trendSeries, 320, 84);

  const saveAuditReport = async () => {
    if (!auditInput) {
      setSaveMessage({
        type: "error",
        text: "Audit input is missing. Please run the audit again.",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setSaveMessage({
        type: "error",
        text: "Please enter a valid email address.",
      });
      return;
    }

    setIsSavingReport(true);
    setSaveMessage(null);
    setPublicReportId(null);

    try {
      const response = await fetch("/api/audit-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          formData: auditInput,
          recommendations: results,
          totalMonthlySavings,
          totalAnnualSavings,
          summary,
        }),
      });

      const payload = (await response.json()) as { error?: string; id?: string | null };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save report.");
      }

      setPublicReportId(payload.id ?? null);
      setSaveMessage({
        type: "success",
        text: "Audit report saved to the database successfully.",
      });
      pushToast("success", "Audit report saved and share link generated.");
    } catch (error) {
      setSaveMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to save report right now. Please try again.",
      });
      pushToast("error", "Saving report failed. Please retry in a moment.");
    } finally {
      setIsSavingReport(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070f] px-4 py-10 text-slate-100 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_90%_15%,rgba(99,102,241,0.14),transparent_40%),linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:auto,auto,36px_36px,36px_36px]" />
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur ${
              toast.type === "success"
                ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
                : toast.type === "error"
                  ? "border-rose-400/40 bg-rose-500/20 text-rose-100"
                  : "border-cyan-400/40 bg-cyan-500/20 text-cyan-100"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <main className="relative mx-auto w-full max-w-6xl space-y-6 lg:space-y-8">
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_24px_80px_-40px_rgba(56,189,248,0.45)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium tracking-wide text-cyan-200">
                Premium AI Spend Intelligence
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Audit and optimize AI spend with a Linear-style control center.
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
                Structured onboarding, real-time insights, and shareable reports in
                a polished Vercel-inspired interface.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
              <p className="font-medium text-white">Workflow progress</p>
              <p className="mt-1">
                Step {step + 1} of {steps.length}:{" "}
                <span className="text-cyan-200">{steps[step]}</span>
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800/90">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 transition-all"
                style={{ width: `${((step + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </section>

        {submitted ? (
          <section className="space-y-6 lg:space-y-8">
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-5">
              <p className="font-semibold text-emerald-200">
                Audit complete: savings dashboard ready.
              </p>
              <p className="mt-1 text-sm text-emerald-100/90">
                Your draft data was cleared from localStorage after submission.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:gap-6">
              <article className="rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 via-slate-950/90 to-slate-950 p-6 shadow-lg shadow-cyan-500/10">
                <p className="text-xs uppercase tracking-wider text-cyan-200/90">
                  Total Monthly Savings
                </p>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
                  {currency.format(totalMonthlySavings)}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Estimated optimization impact per month
                </p>
              </article>

              <article className="rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/20 via-slate-950/90 to-slate-950 p-6 shadow-lg shadow-indigo-500/10">
                <p className="text-xs uppercase tracking-wider text-indigo-200/90">
                  Total Annual Savings
                </p>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
                  {currency.format(totalAnnualSavings)}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Projected savings across 12 months
                </p>
              </article>
            </div>

            <article className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-medium text-white sm:text-xl">
                  AI Personalized Financial Summary
                </h2>
                {summary?.source === "ai" ? (
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs text-emerald-200">
                    AI generated
                  </span>
                ) : summary?.source === "fallback" ? (
                  <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs text-amber-200">
                    Fallback summary
                  </span>
                ) : null}
              </div>
              {isSummaryLoading ? (
                <div className="mt-3 animate-pulse space-y-2">
                  <div className="h-3 w-full rounded bg-slate-800" />
                  <div className="h-3 w-11/12 rounded bg-slate-800" />
                  <div className="h-3 w-9/12 rounded bg-slate-800" />
                </div>
              ) : (
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {summary?.text ||
                    "Summary unavailable. Run another audit to generate a fresh summary."}
                </p>
              )}
            </article>

            <article className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
              <h2 className="text-lg font-medium text-white sm:text-xl">
                Email Report Capture
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Save this audit report to Supabase and link it to your email for
                follow-up insights.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/80 px-4 text-sm text-white outline-none ring-cyan-300 transition focus:ring-2"
                />
                <button
                  type="button"
                  onClick={saveAuditReport}
                  disabled={isSavingReport}
                  className="h-11 rounded-xl bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingReport ? "Saving..." : "Save Report"}
                </button>
              </div>
              {saveMessage ? (
                <p
                  className={`mt-3 text-sm ${
                    saveMessage.type === "success"
                      ? "text-emerald-300"
                      : "text-rose-300"
                  }`}
                >
                  {saveMessage.text}
                </p>
              ) : null}
              {publicReportId ? (
                <p className="mt-2 text-sm text-cyan-200">
                  Public share link:{" "}
                  <a
                    href={`/audit/${publicReportId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline underline-offset-4 hover:text-cyan-100"
                  >
                    /audit/{publicReportId}
                  </a>
                </p>
              ) : null}
            </article>

            <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
              <article className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur lg:col-span-2">
                <h2 className="text-lg font-medium text-white sm:text-xl">
                  Spend vs Optimized Spend
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  Visual comparison of current monthly spend and projected post-audit spend.
                </p>

                <div className="mt-5 space-y-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                      <span>Current monthly spend</span>
                      <span>{currency.format(monthlySpend)}</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-800/90">
                      <div className="h-3 w-full rounded-full bg-rose-400/80" />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                      <span>Projected optimized spend</span>
                      <span>{currency.format(optimizedMonthlySpend)}</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-800/90">
                      <div
                        className="h-3 rounded-full bg-cyan-400/80 transition-all"
                        style={{
                          width: `${monthlySpend > 0 ? (optimizedMonthlySpend / monthlySpend) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                    <span>6-month spend trend indicator</span>
                    <span>{savingsRate.toFixed(1)}% savings rate</span>
                  </div>
                  <svg
                    viewBox="0 0 320 84"
                    className="h-24 w-full"
                    role="img"
                    aria-label="Spend trend line"
                  >
                    <polyline
                      fill="none"
                      stroke="rgb(56 189 248)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      points={trendPoints}
                    />
                  </svg>
                </div>
              </article>

              <article className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
                <h2 className="text-lg font-medium text-white sm:text-xl">Savings Indicators</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Quick visual breakdown of realized optimization impact.
                </p>

                <div className="mt-4 space-y-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                      <span>Savings rate</span>
                      <span>{savingsRate.toFixed(1)}%</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-800/90">
                      <div
                        className="h-2.5 rounded-full bg-cyan-400 transition-all"
                        style={{ width: `${Math.min(savingsRate, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                      <span>Monthly to annual multiplier</span>
                      <span>12x</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-800/90">
                      <div className="h-2.5 w-full rounded-full bg-indigo-400/80" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200">
                    <p className="font-medium text-white">Net monthly reduction</p>
                    <p className="mt-1">{currency.format(totalMonthlySavings)}</p>
                  </div>
                </div>
              </article>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-medium text-white sm:text-xl">
                  Per-Tool Recommendations
                </h2>
                <span className="rounded-full border border-white/15 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                  Tool: {auditInput?.toolName || "N/A"} | Plan:{" "}
                  {auditInput?.plan || "N/A"}
                </span>
              </div>

              {results.length > 0 ? (
                <div className="mt-4 grid gap-4">
                  {results.map((item) => (
                    <article
                      key={item.title}
                      className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-lg shadow-black/30"
                    >
                      <h3 className="text-base font-semibold text-white">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-300">
                        {auditInput?.toolName || "Selected tool"} optimization
                        recommendation
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
                        <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-cyan-200">
                          Monthly: {currency.format(item.monthlySavings)}
                        </span>
                        <span className="rounded-full bg-indigo-400/15 px-3 py-1 text-indigo-200">
                          Annual: {currency.format(item.annualSavings)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-300">{item.reason}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/70 p-4">
                  <p className="text-sm text-slate-200">
                    No immediate optimization rules were triggered for this tool.
                    Current setup appears cost-aligned against this policy set.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      pushToast(
                        "info",
                        "No savings rules matched this input. Try a different tool or spend profile.",
                      )
                    }
                    className="mt-3 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-white/10"
                  >
                    Learn why this is empty
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setStep(0);
                setSaveMessage(null);
                setPublicReportId(null);
              }}
              className="h-11 rounded-xl border border-white/20 bg-slate-900/50 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Run New Audit
            </button>
          </section>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur sm:p-8"
          >
            <div className="grid gap-5 sm:gap-6">
            {step === 0 && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-200">
                    Tool Name
                  </label>
                  <input
                    type="text"
                    {...register("toolName", { required: "Tool name is required." })}
                    className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none ring-cyan-300 focus:ring-2"
                    placeholder="OpenAI API"
                  />
                  {errors.toolName && (
                    <p className="mt-1 text-xs text-rose-300">{errors.toolName.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-200">
                    Plan
                  </label>
                  <select
                    {...register("plan", { required: "Plan is required." })}
                    className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none ring-cyan-300 focus:ring-2"
                  >
                    <option value="">Select plan</option>
                    <option value="Free">Free</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                  {errors.plan && (
                    <p className="mt-1 text-xs text-rose-300">{errors.plan.message}</p>
                  )}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-200">
                    Monthly Spend
                  </label>
                  <input
                    type="number"
                    min={0}
                    {...register("monthlySpend", {
                      required: "Monthly spend is required.",
                      valueAsNumber: true,
                      min: { value: 0, message: "Cannot be negative." },
                    })}
                    className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none ring-cyan-300 focus:ring-2"
                    placeholder="1200"
                  />
                  {errors.monthlySpend && (
                    <p className="mt-1 text-xs text-rose-300">
                      {errors.monthlySpend.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-200">
                    Seats
                  </label>
                  <input
                    type="number"
                    min={1}
                    {...register("seats", {
                      required: "Seats are required.",
                      valueAsNumber: true,
                      min: { value: 1, message: "At least 1 seat required." },
                    })}
                    className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none ring-cyan-300 focus:ring-2"
                    placeholder="15"
                  />
                  {errors.seats && (
                    <p className="mt-1 text-xs text-rose-300">{errors.seats.message}</p>
                  )}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-200">
                    Team Size
                  </label>
                  <select
                    {...register("teamSize", { required: "Team size is required." })}
                    className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none ring-cyan-300 focus:ring-2"
                  >
                    <option value="">Select team size</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="201+">201+</option>
                  </select>
                  {errors.teamSize && (
                    <p className="mt-1 text-xs text-rose-300">{errors.teamSize.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-200">
                    Use Case
                  </label>
                  <textarea
                    rows={4}
                    {...register("useCase", { required: "Use case is required." })}
                    className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none ring-cyan-300 focus:ring-2"
                    placeholder="Customer support chatbot, code assistant, internal search..."
                  />
                  {errors.useCase && (
                    <p className="mt-1 text-xs text-rose-300">{errors.useCase.message}</p>
                  )}
                </div>
              </>
            )}

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
                disabled={step === 0}
                className="h-11 rounded-xl border border-white/20 bg-slate-900/50 px-5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Back
              </button>

              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="h-11 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-5 text-sm font-semibold text-slate-950 transition hover:from-cyan-300 hover:to-sky-300"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-5 text-sm font-semibold text-slate-950 transition hover:from-cyan-300 hover:to-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Running audit..." : "Submit"}
                </button>
              )}
            </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
