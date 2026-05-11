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

type SummaryRequest = {
  formData: SpendFormValues;
  recommendations: AuditRecommendation[];
  totalMonthlySavings: number;
  totalAnnualSavings: number;
};

function buildPrompt(payload: SummaryRequest) {
  const recommendationLines = payload.recommendations
    .slice(0, 5)
    .map(
      (item) =>
        `- ${item.title}: monthly=${item.monthlySavings}, annual=${item.annualSavings}, reason=${item.reason}`,
    )
    .join("\n");

  return `
You are a SaaS finance analyst. Write a concise personalized summary in 3-4 sentences.
Tone: executive, practical, and financial.
Must include:
1) current setup context
2) total monthly and annual savings
3) top recommendation and why it matters financially
4) one low-risk next action

Input:
Tool: ${payload.formData.toolName}
Plan: ${payload.formData.plan}
Monthly spend: ${payload.formData.monthlySpend}
Seats: ${payload.formData.seats}
Team size: ${payload.formData.teamSize}
Use case: ${payload.formData.useCase}
Total monthly savings: ${payload.totalMonthlySavings}
Total annual savings: ${payload.totalAnnualSavings}
Recommendations:
${recommendationLines || "- None"}
`.trim();
}

async function generateWithOpenAI(prompt: string, apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "You write concise financial optimization summaries.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("OpenAI request failed");
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI returned empty summary");
  }
  return content;
}

async function generateWithAnthropic(prompt: string, apiKey: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: 220,
      temperature: 0.3,
      system: "You write concise financial optimization summaries.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error("Anthropic request failed");
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = data.content
    ?.filter((item) => item.type === "text" && item.text)
    .map((item) => item.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Anthropic returned empty summary");
  }
  return text;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SummaryRequest;
    const prompt = buildPrompt(payload);

    const openAiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    let summary: string | null = null;

    if (openAiKey) {
      try {
        summary = await generateWithOpenAI(prompt, openAiKey);
      } catch {
        summary = null;
      }
    }

    if (!summary && anthropicKey) {
      try {
        summary = await generateWithAnthropic(prompt, anthropicKey);
      } catch {
        summary = null;
      }
    }

    if (!summary) {
      return NextResponse.json(
        { error: "AI provider unavailable" },
        { status: 503 },
      );
    }

    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
