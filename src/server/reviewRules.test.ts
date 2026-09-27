import { describe, expect, it } from "vitest";
import { DISCIPLINES, QOL_AREAS, buildCelebration, goalGrade, valleyGuidance } from "./reviewRules";
import type { WeekScore } from "./scoring";

const score = (week: number, scorePct: number): WeekScore => ({
  week, due: 5, completed: Math.round((scorePct / 100) * 5), scorePct, band: "ON_TRACK",
});

describe("catalogs (the book's lists)", () => {
  it("six quality-of-life areas, five success disciplines", () => {
    expect(QOL_AREAS).toEqual(["Spiritual", "Spouse/Key Relationship", "Family", "Business", "Personal", "Physical"]);
    expect(DISCIPLINES).toHaveLength(5);
    expect(DISCIPLINES[0]).toBe("Vision");
    expect(DISCIPLINES[4]).toBe("Key Measures");
  });
});

describe("goalGrade (auto-suggested 1-10)", () => {
  it("blends completion and execution equally", () => {
    expect(goalGrade(100, 100)).toBe(10);
    expect(goalGrade(0, 0)).toBe(1); // clamped from 0
    expect(goalGrade(50, 50)).toBe(5);
  });
  it("is null-safe: missing side defaults to the other, both null floors at 1", () => {
    expect(goalGrade(null, 80)).toBe(8);
    expect(goalGrade(60, null)).toBe(6);
    expect(goalGrade(null, null)).toBe(1);
  });
});

describe("valleyGuidance (weeks 3-6, the valley of despair)", () => {
  it("fires for low scores in the valley window", () => {
    const g = valleyGuidance(4, 55);
    expect(g).not.toBeNull();
    expect(g!.headline).toMatch(/valley/i);
  });
  it("stays quiet outside weeks 3-6 or when executing well", () => {
    expect(valleyGuidance(2, 40)).toBeNull();
    expect(valleyGuidance(7, 40)).toBeNull();
    expect(valleyGuidance(4, 90)).toBeNull();
    expect(valleyGuidance(4, null)).toBeNull();
  });
});

describe("buildCelebration (celebrate before analysis)", () => {
  it("derives best week, average, and goal counts", () => {
    const c = buildCelebration([score(1, 86), null, score(3, 100), score(4, 64)], [
      { status: "achieved" }, { status: "active" }, { status: "missed" },
    ]);
    expect(c.bestWeek).toEqual({ week: 3, scorePct: 100 });
    expect(c.scoredWeeks).toBe(3);
    expect(c.averageScore).toBe(83); // round((86+100+64)/3)
    expect(c.goalsCompleted).toBe(1);
    expect(c.goalsTotal).toBe(3);
  });
  it("handles an empty cycle", () => {
    const c = buildCelebration([], []);
    expect(c.bestWeek).toBeNull();
    expect(c.averageScore).toBeNull();
    expect(c.goalsTotal).toBe(0);
  });
});
