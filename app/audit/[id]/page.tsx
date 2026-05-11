import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Recommendation = {
  title: string;
  monthlySavings: number;
  annualSavings: number;
  reason: string;
};

type PublicAuditReport = {
  public_id: string;
  tool_name: string;
  plan: string;
  recommendations: Recommendation[] | null;
  total_monthly_savings: number;
  total_annual_savings: number;
  summary_text: string | null;
  summary_source: string | null;
  created_at: string;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function getAuditReport(id: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("audit_reports")
    .select(
      "public_id, tool_name, plan, recommendations, total_monthly_savings, total_annual_savings, summary_text, summary_source, created_at",
    )
    .eq("public_id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as PublicAuditReport;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const report = await getAuditReport(id);

  if (!report) {
    return {
      title: "Audit Report Not Found",
      description: "This public audit report is unavailable.",
      robots: { index: false, follow: false },
    };
  }

  const title = `${report.tool_name} AI Spend Audit Results`;
  const description = `Monthly savings ${currency.format(report.total_monthly_savings)} and annual savings ${currency.format(report.total_annual_savings)} from this AI spend optimization audit.`;
  const url = `${appUrl}/audit/${report.public_id}`;
  const imageUrl = `${appUrl}/audit/${report.public_id}/opengraph-image`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${report.tool_name} savings preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function PublicAuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getAuditReport(id);

  if (!report) {
    notFound();
  }

  const recommendations = report.recommendations ?? [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070f] px-4 py-10 text-slate-100 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_90%_20%,rgba(99,102,241,0.14),transparent_40%),linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:auto,auto,36px_36px,36px_36px]" />
      <main className="relative mx-auto w-full max-w-5xl space-y-6 lg:space-y-8">
        <header className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_24px_80px_-40px_rgba(56,189,248,0.45)] backdrop-blur-xl sm:p-8">
          <p className="text-xs uppercase tracking-wider text-cyan-200">
            Public Audit Report
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            AI Spend Optimization Insights
          </h1>
          <p className="mt-3 text-sm text-slate-300 sm:text-base">
            Tool: {report.tool_name} | Plan: {report.plan} | Generated{" "}
            {new Date(report.created_at).toLocaleDateString()}
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:gap-6">
          <article className="rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 via-slate-950/90 to-slate-950 p-6 shadow-lg shadow-cyan-500/10">
            <p className="text-xs uppercase tracking-wider text-cyan-200/90">
              Total Monthly Savings
            </p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
              {currency.format(report.total_monthly_savings)}
            </p>
          </article>
          <article className="rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/20 via-slate-950/90 to-slate-950 p-6 shadow-lg shadow-indigo-500/10">
            <p className="text-xs uppercase tracking-wider text-indigo-200/90">
              Total Annual Savings
            </p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
              {currency.format(report.total_annual_savings)}
            </p>
          </article>
        </section>

        {report.summary_text ? (
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-medium text-white sm:text-xl">
                Executive Financial Summary
              </h2>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                Source: {report.summary_source || "n/a"}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-200">{report.summary_text}</p>
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-lg font-medium text-white sm:text-xl">
            Recommendations and Savings
          </h2>
          {recommendations.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <p className="text-sm text-slate-300">
                No optimization recommendations were triggered for this audit.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              {recommendations.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-lg shadow-black/25"
                >
                  <h3 className="text-base font-semibold text-white">{item.title}</h3>
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
          )}
        </section>
      </main>
    </div>
  );
}
