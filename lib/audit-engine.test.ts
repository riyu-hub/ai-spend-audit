import { describe, expect, it } from "vitest";
import {
  buildAuditRecommendations,
  estimatePerSeatCost,
  type SpendFormValues,
} from "./audit-engine";

const baseInput: SpendFormValues = {
  toolName: "OpenAI API",
  plan: "Pro",
  monthlySpend: 6000,
  seats: 20,
  teamSize: "11-50",
  useCase: "customer support chatbot",
};

describe("estimatePerSeatCost", () => {
  it("returns expected seat costs by plan", () => {
    expect(estimatePerSeatCost("Enterprise")).toBe(120);
    expect(estimatePerSeatCost("Pro")).toBe(60);
    expect(estimatePerSeatCost("Free")).toBe(20);
    expect(estimatePerSeatCost("Unknown")).toBe(20);
  });
});

describe("buildAuditRecommendations", () => {
  it("triggers enterprise right-sizing when team is not 201+", () => {
    const input: SpendFormValues = {
      ...baseInput,
      plan: "Enterprise",
      teamSize: "51-200",
      monthlySpend: 8000,
      seats: 30,
    };

    const recommendations = buildAuditRecommendations(input);
    const rightSize = recommendations.find((r) => r.title === "Right-size plan to Pro");

    expect(rightSize).toBeDefined();
    expect(rightSize?.monthlySavings).toBe(1600);
    expect(rightSize?.annualSavings).toBe(19200);
  });

  it("calculates unused seat savings correctly", () => {
    const input: SpendFormValues = {
      ...baseInput,
      plan: "Pro",
      teamSize: "11-50",
      seats: 50, // expected 35 => 15 unused * 60
    };

    const recommendations = buildAuditRecommendations(input);
    const seatRec = recommendations.find((r) => r.title === "Remove unused seats");

    expect(seatRec).toBeDefined();
    expect(seatRec?.monthlySavings).toBe(900);
    expect(seatRec?.annualSavings).toBe(10800);
  });

  it("applies high-spend rule only above threshold", () => {
    const lowSpend = buildAuditRecommendations({ ...baseInput, monthlySpend: 5000 });
    const highSpend = buildAuditRecommendations({ ...baseInput, monthlySpend: 5001 });

    expect(
      lowSpend.some((r) => r.title === "Apply usage caps and budget alerts"),
    ).toBe(false);
    expect(
      highSpend.some((r) => r.title === "Apply usage caps and budget alerts"),
    ).toBe(true);
  });

  it("returns zero recommendations for edge-case no-op input", () => {
    const recommendations = buildAuditRecommendations({
      toolName: "Tool",
      plan: "Free",
      monthlySpend: 0,
      seats: 1,
      teamSize: "1-10",
      useCase: "generic",
    });

    expect(recommendations).toHaveLength(0);
  });

  it("prevents negative savings when monthly spend is negative", () => {
    const recommendations = buildAuditRecommendations({
      ...baseInput,
      monthlySpend: -1000,
      seats: 10,
      teamSize: "1-10",
      useCase: "assistant",
    });

    expect(recommendations.every((r) => r.monthlySavings > 0)).toBe(true);
    const assistantRec = recommendations.find(
      (r) => r.title === "Route repetitive requests to cheaper models",
    );
    expect(assistantRec).toBeUndefined();
  });

  it("sorts recommendations by highest monthly savings first", () => {
    const recommendations = buildAuditRecommendations({
      ...baseInput,
      plan: "Enterprise",
      monthlySpend: 7000,
      teamSize: "11-50",
      seats: 60,
      useCase: "internal copilot for support",
    });

    for (let i = 1; i < recommendations.length; i += 1) {
      expect(recommendations[i - 1].monthlySavings).toBeGreaterThanOrEqual(
        recommendations[i].monthlySavings,
      );
    }
  });
});
