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

describe("diagnosisFor (closed evidence)", () => {
  const execution = (a: number, b: number) => [
    { week: 1, scorePct: a },
    { week: 2, scorePct: b },
  ];
  const lag = (a: number, b: number) => [
    { week: 1, value: a },
    { week: 2, value: b },
  ];

  it("requires at least two closed execution and lag observations", () => {
    expect(diagnosisFor([], lag(10, 20), 0, 100).status).toBe("INSUFFICIENT_DATA");
    expect(diagnosisFor(execution(90, 90), [{ week: 1, value: 20 }], 0, 100).status).toBe("INSUFFICIENT_DATA");
  });

  it("reports an execution concern when the latest two scores average below 65%", () => {
    expect(diagnosisFor(execution(50, 60), lag(10, 20), 0, 100).status).toBe("EXECUTION_CONCERN");
  });

  it("keeps an average of exactly 65% in review status", () => {
    expect(diagnosisFor(execution(60, 70), lag(10, 20), 0, 100).status).toBe("REVIEW");
  });

  it("reports a strategy concern at exactly 85% when lag progress is flat", () => {
    const result = diagnosisFor(execution(80, 90), lag(50, 50), 0, 100);
    expect(result.status).toBe("STRATEGY_CONCERN");
    expect(result.execution).toEqual(execution(80, 90));
    expect(result.lag).toEqual(lag(50, 50));
  });

  it("reports a strategy concern when normalized lag progress declines", () => {
    expect(diagnosisFor(execution(85, 90), lag(40, 30), 0, 100).status).toBe("STRATEGY_CONCERN");
  });

  it("keeps increasing lag progress in review status", () => {
    expect(diagnosisFor(execution(90, 90), lag(40, 50), 0, 100).status).toBe("REVIEW");
  });

  it("compares normalized progress for descending targets", () => {
    expect(diagnosisFor(execution(90, 90), lag(175, 174), 180, 170).status).toBe("REVIEW");
    expect(diagnosisFor(execution(90, 90), lag(175, 176), 180, 170).status).toBe("STRATEGY_CONCERN");
  });

  it("does not flag a goal that has already met its target", () => {
    expect(diagnosisFor(execution(90, 90), lag(100, 100), 0, 100).status).toBe("REVIEW");
  });
});
