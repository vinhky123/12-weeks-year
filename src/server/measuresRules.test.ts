import { describe, expect, it } from "vitest";
import { diagnosisFor, lagProgress } from "./measuresRules";

describe("lagProgress", () => {
  it("works upward (revenue)", () => {
    expect(lagProgress(0, 1000, 500)).toBe(0.5);
    expect(lagProgress(0, 1000, 1000)).toBe(1);
    expect(lagProgress(0, 1000, 1200)).toBe(1); // clamped
  });
  it("works downward (weight loss)", () => {
    expect(lagProgress(180, 170, 175)).toBe(0.5);
    expect(lagProgress(180, 170, 169)).toBe(1);
  });
  it("no movement and wrong direction clamp to 0", () => {
    expect(lagProgress(180, 170, 180)).toBe(0);
    expect(lagProgress(180, 170, 185)).toBe(0);
  });
  it("null when target equals start (not measurable) or no data yet", () => {
    expect(lagProgress(100, 100, 100)).toBeNull();
    expect(lagProgress(0, 100, null)).toBeNull();
  });
});

describe("diagnosisFor (strategy vs execution)", () => {
  it("high execution + flat lag = strategy problem (change tactics)", () => {
    expect(diagnosisFor(90, 0.1)).toBe("STRATEGY_PROBLEM");
  });
  it("low execution = execution problem (process control)", () => {
    expect(diagnosisFor(60, 0.1)).toBe("EXECUTION_PROBLEM");
    expect(diagnosisFor(30, 0.9)).toBe("EXECUTION_PROBLEM");
  });
  it("healthy execution + moving lag = no diagnosis", () => {
    expect(diagnosisFor(85, 0.5)).toBeNull();
    expect(diagnosisFor(75, 0.6)).toBeNull();
    expect(diagnosisFor(null, null)).toBeNull();
  });
});
