import { describe, expect, it } from "vitest";
import {
  AT_RISK_THRESHOLD, ON_TRACK_THRESHOLD, bandFor, cycleAverageScore, dueForWeek,
  goalScore, weekScore, type TacticLike, type WeekScore,
} from "./scoring";

function tactic(partial: Partial<TacticLike> & { id: number }): TacticLike {
  return {
    goalId: 1,
    duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 },
    activeFromWeek: 1,
    deactivatedAtWeek: null,
    ...partial,
  };
}

describe("dueForWeek", () => {
  it("EVERY_WEEK due equals timesPerWeek", () => {
    expect(dueForWeek(tactic({ id: 1, duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } }), 4)).toBe(3);
  });
  it("SPECIFIC_WEEKS due 1 only in listed weeks", () => {
    const t = tactic({ id: 1, duePattern: { type: "SPECIFIC_WEEKS", weeks: [3, 7] } });
    expect(dueForWeek(t, 3)).toBe(1);
    expect(dueForWeek(t, 4)).toBe(0);
    expect(dueForWeek(t, 7)).toBe(1);
  });
  it("respects activeFromWeek and deactivatedAtWeek", () => {
    const t = tactic({ id: 1, activeFromWeek: 5, deactivatedAtWeek: 6 });
    expect(dueForWeek(t, 4)).toBe(0);
    expect(dueForWeek(t, 5)).toBe(1);
    expect(dueForWeek(t, 6)).toBe(1);
    expect(dueForWeek(t, 7)).toBe(0);
  });
  it("never dues outside weeks 1-12", () => {
    expect(dueForWeek(tactic({ id: 1 }), 0)).toBe(0);
    expect(dueForWeek(tactic({ id: 1 }), 13)).toBe(0);
  });
  it("guards junk patterns", () => {
    expect(dueForWeek(tactic({ id: 1, duePattern: { type: "EVERY_WEEK", timesPerWeek: Number.NaN } }), 2)).toBe(0);
    expect(dueForWeek(tactic({ id: 1, duePattern: { type: "EVERY_WEEK", timesPerWeek: 0 } }), 2)).toBe(0);
  });
});

describe("weekScore", () => {
  const tactics = [
    tactic({ id: 1, duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } }),
    tactic({ id: 2, duePattern: { type: "SPECIFIC_WEEKS", weeks: [2] } }),
  ];

  it("computes score, caps over-completion, ignores negative", () => {
    const score = weekScore(tactics, new Map([[1, 5], [2, 1]]), 2);
    expect(score).toEqual({ week: 2, due: 4, completed: 4, scorePct: 100, band: "ON_TRACK" });
    const negative = weekScore(tactics, new Map([[1, -2]]), 2);
    expect(negative!.completed).toBe(0);
  });
  it("is null when nothing is due", () => {
    expect(weekScore(tactics, new Map(), 1)).not.toBeNull(); // tactic 1 due in week 1
    expect(weekScore([tactics[1]], new Map(), 1)).toBeNull();
  });
  it("rounds to whole percent", () => {
    const t = [tactic({ id: 1, duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } })];
    expect(weekScore(t, new Map([[1, 2]]), 1)!.scorePct).toBe(67);
  });
  it("bands at the book's thresholds", () => {
    const t = [tactic({ id: 1, duePattern: { type: "EVERY_WEEK", timesPerWeek: 20 } })];
    expect(weekScore(t, new Map([[1, 17]]), 1)!.band).toBe("ON_TRACK");    // 85%
    expect(weekScore(t, new Map([[1, 16]]), 1)!.band).toBe("AT_RISK");     // 80%
    expect(weekScore(t, new Map([[1, 12]]), 1)!.band).toBe("REVISE_PLAN"); // 60%
  });
});

describe("bandFor thresholds", () => {
  it("uses the book's numbers", () => {
    expect(ON_TRACK_THRESHOLD).toBe(85);
    expect(AT_RISK_THRESHOLD).toBe(65);
    expect(bandFor(100)).toBe("ON_TRACK");
    expect(bandFor(85)).toBe("ON_TRACK");
    expect(bandFor(84)).toBe("AT_RISK");
    expect(bandFor(65)).toBe("AT_RISK");
    expect(bandFor(64)).toBe("REVISE_PLAN");
    expect(bandFor(0)).toBe("REVISE_PLAN");
  });
});

describe("goalScore", () => {
  it("filters tactics by goal", () => {
    const tactics = [
      tactic({ id: 1, goalId: 10 }),
      tactic({ id: 2, goalId: 20 }),
    ];
    const score = goalScore(tactics, new Map([[1, 1], [2, 0]]), 1, 10);
    expect(score).toEqual({ week: 1, due: 1, completed: 1, scorePct: 100, band: "ON_TRACK" });
  });
});

describe("cycleAverageScore", () => {
  it("averages scored weeks and ignores nulls", () => {
    const s = (week: number, scorePct: number): WeekScore =>
      ({ week, due: 1, completed: 1, scorePct, band: bandFor(scorePct) });
    expect(cycleAverageScore([s(1, 80), null, s(2, 90)])).toBe(85);
  });
  it("is null with no scored weeks", () => {
    expect(cycleAverageScore([null, null])).toBeNull();
    expect(cycleAverageScore([])).toBeNull();
  });
});
