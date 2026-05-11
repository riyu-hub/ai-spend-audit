import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type SpendFormValues = {
  toolName: string;
  plan: string;
  monthlySpend: number;
  seats: number;
  teamSize: string;
  useCase: string;
};

type AuditRecommendation = {
  title: string;
  monthlySavings: number;
  annualSavings: number;
  reason: string;
};

type SummaryState = {
  text: string;
  source: "ai" | "fallback";
};

type SaveAuditReportRequest = {
  email: string;
  formData: SpendFormValues;
  recommendations: AuditRecommendation[];
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  summary: SummaryState | null;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SaveAuditReportRequest;
    const email = payload.email?.trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: "Supabase server credentials are not configured." },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from("audit_reports")
      .insert({
        email,
        tool_name: payload.formData.toolName,
        plan: payload.formData.plan,
        monthly_spend: payload.formData.monthlySpend,
        seats: payload.formData.seats,
        team_size: payload.formData.teamSize,
        use_case: payload.formData.useCase,
        recommendations: payload.recommendations,
        total_monthly_savings: payload.totalMonthlySavings,
        total_annual_savings: payload.totalAnnualSavings,
        summary_text: payload.summary?.text ?? null,
        summary_source: payload.summary?.source ?? null,
        created_at: new Date().toISOString(),
      })
      .select("public_id")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to save audit report.", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, id: data?.public_id ?? null });
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}
