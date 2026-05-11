import { createClient } from "@supabase/supabase-js";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

type PublicAuditReport = {
  tool_name: string;
  plan: string;
  total_monthly_savings: number;
  total_annual_savings: number;
};

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
    .select("tool_name, plan, total_monthly_savings, total_annual_savings")
    .eq("public_id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as PublicAuditReport;
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getAuditReport(id);

  const toolName = report?.tool_name || "AI Spend";
  const plan = report?.plan || "Audit";
  const monthly = currency.format(report?.total_monthly_savings || 0);
  const annual = currency.format(report?.total_annual_savings || 0);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px",
          color: "#e2e8f0",
          background:
            "radial-gradient(circle at top right, rgba(34,211,238,0.2), transparent 40%), radial-gradient(circle at bottom left, rgba(99,102,241,0.25), transparent 35%), #020617",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              fontSize: 22,
              color: "#67e8f9",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Public AI Spend Audit
          </div>
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.05,
              maxWidth: "900px",
            }}
          >
            {toolName} Optimization Report
          </div>
          <div style={{ fontSize: 30, color: "#cbd5e1" }}>Plan: {plan}</div>
        </div>

        <div style={{ display: "flex", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              border: "1px solid rgba(34,211,238,0.35)",
              borderRadius: "20px",
              padding: "20px 24px",
              background: "rgba(15,23,42,0.7)",
              minWidth: "280px",
            }}
          >
            <div style={{ fontSize: 18, color: "#a5f3fc", textTransform: "uppercase" }}>
              Monthly Savings
            </div>
            <div style={{ fontSize: 42, fontWeight: 700, color: "white" }}>{monthly}</div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              border: "1px solid rgba(129,140,248,0.4)",
              borderRadius: "20px",
              padding: "20px 24px",
              background: "rgba(15,23,42,0.7)",
              minWidth: "280px",
            }}
          >
            <div style={{ fontSize: 18, color: "#c7d2fe", textTransform: "uppercase" }}>
              Annual Savings
            </div>
            <div style={{ fontSize: 42, fontWeight: 700, color: "white" }}>{annual}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
