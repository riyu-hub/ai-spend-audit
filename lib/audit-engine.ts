export type SpendFormValues = {
  toolName: string;
  plan: string;
  monthlySpend: number;
  seats: number;
  teamSize: string;
  useCase: string;
};

export type AuditRecommendation = {
  title: string;
  monthlySavings: number;
  annualSavings: number;
  reason: string;
};

export function estimatePerSeatCost(plan: string) {
  if (plan === "Enterprise") return 120;
  if (plan === "Pro") return 60;
  return 20;
}

function getExpectedSeats(teamSize: string) {
  if (teamSize === "1-10") return 8;
  if (teamSize === "11-50") return 35;
  if (teamSize === "51-200") return 120;
  return 260;
}

export function buildAuditRecommendations(
  values: SpendFormValues,
): AuditRecommendation[] {
  const recommendations: AuditRecommendation[] = [];
  const perSeatCost = estimatePerSeatCost(values.plan);
  const baselineSpend = Math.max(values.monthlySpend || 0, 0);
  const seatSpend = Math.max((values.seats || 0) * perSeatCost, 0);
  const spendAnchor = Math.max(baselineSpend, seatSpend);

  if (values.plan === "Enterprise" && values.teamSize !== "201+") {
    const monthlySavings = Math.round(spendAnchor * 0.2);
    recommendations.push({
      title: "Right-size plan to Pro",
      monthlySavings,
      annualSavings: monthlySavings * 12,
      reason:
        "Enterprise overhead is typically underutilized for smaller teams, so downgrading reduces fixed license cost.",
    });
  }

  const expectedSeats = getExpectedSeats(values.teamSize);
  if (values.seats > expectedSeats) {
    const unusedSeats = values.seats - expectedSeats;
    const monthlySavings = Math.round(unusedSeats * perSeatCost);
    recommendations.push({
      title: "Remove unused seats",
      monthlySavings,
      annualSavings: monthlySavings * 12,
      reason:
        "Seat count exceeds expected active users for your team size, which creates recurring idle license spend.",
    });
  }

  if (baselineSpend > 5000) {
    const monthlySavings = Math.round(baselineSpend * 0.15);
    recommendations.push({
      title: "Apply usage caps and budget alerts",
      monthlySavings,
      annualSavings: monthlySavings * 12,
      reason:
        "High monthly spend usually includes burst traffic and non-critical workloads that can be controlled with caps.",
    });
  }

  if (/chatbot|support|assistant/i.test(values.useCase)) {
    const monthlySavings = Math.round(baselineSpend * 0.12);
    recommendations.push({
      title: "Route repetitive requests to cheaper models",
      monthlySavings,
      annualSavings: monthlySavings * 12,
      reason:
        "Support-style use cases have repeated prompts where lightweight models maintain quality at lower token cost.",
    });
  }

  if (/internal|search|knowledge|copilot/i.test(values.useCase)) {
    const monthlySavings = Math.round(baselineSpend * 0.1);
    recommendations.push({
      title: "Introduce caching for repeated queries",
      monthlySavings,
      annualSavings: monthlySavings * 12,
      reason:
        "Internal search and copilot patterns often reuse context, so response caching reduces duplicate token spend.",
    });
  }

  return recommendations
    .filter((item) => item.monthlySavings > 0)
    .sort((a, b) => b.monthlySavings - a.monthlySavings);
}
