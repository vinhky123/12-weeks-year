import { describe, expect, it } from "vitest";
import {
  generateWeekPlanItems, nextRitual, tacticsDueInWeek, validateNewGoal, validateNewTactic,
  type RitualState,
} from "./planRules";
import type { DuePattern, TacticLike } from "./scoring";

function tactic(partial: Partial<TacticLike> & { id: number }): TacticLike {
  return {
    goalId: 1,
    duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 },
    activeFromWeek: 1,
    deactivatedAtWeek: null,
    ...partial,
  };
}

describe("tacticsDueInWeek", () => {
  it("returns only tactics with due > 0, with their due counts", () => {
    const tactics = [
      tactic({ id: 1, duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } }),
      tactic({ id: 2, duePattern: { type: "SPECIFIC_WEEKS", weeks: [4] } }),
      tactic({ id: 3, duePattern: { type: "EVERY_WEEK", timesPerWeek: 2 }, activeFromWeek: 5 }),
    ];
    const week4 = tacticsDueInWeek(tactics, 4);
    expect(week4).toHaveLength(2);
    expect(week4[0]).toEqual({ tactic: tactics[0], dueCount: 3 });
    expect(week4[1]).toEqual({ tactic: tactics[1], dueCount: 1 });
  });
});

describe("generateWeekPlanItems", () => {
  it("creates one item per due tactic, Monday default, in received order", () => {
    const tactics = [
      tactic({ id: 7, goalId: 1, duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 }, }),
      tactic({ id: 8, goalId: 2, duePattern: { type: "SPECIFIC_WEEKS", weeks: [2] } }),
    ];
    const items = generateWeekPlanItems(tactics, 2);
    expect(items).toEqual([
      { label: expect.any(String), tacticId: 7, dayOfWeek: 0, plannedCount: 3, sortOrder: 0 },
      { label: expect.any(String), tacticId: 8, dayOfWeek: 0, plannedCount: 1, sortOrder: 1 },
    ]);
  });
  it("labels come from tactic text", () => {
    const tactics = [tactic({ id: 1, duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } })];
    // TacticLike has no text field; labels are provided by the caller via textById map
    const items = generateWeekPlanItems(tactics, 1, new Map([[1, "Perform 30-min strength training"]]));
    expect(items[0]!.label).toBe("Perform 30-min strength training");
  });
});

describe("validateNewGoal", () => {
  const base = {
    title: "Lose 10 lbs",
    why: "Energy and confidence",
    lagMetricName: "Weight",
    lagUnit: "lbs",
    lagStart: 180,
    lagTarget: 170,
    deadlineWeek: 12,
  };
  it("accepts a well-formed goal", () => {
    expect(validateNewGoal(0, base)).toEqual([]);
  });
  it("rejects the 4th active goal (max 3 — the vital few)", () => {
    expect(validateNewGoal(3, base)).toEqual([expect.objectContaining({ field: "count" })]);
  });
  it("requires the why (book rule)", () => {
    expect(validateNewGoal(0, { ...base, why: "  " })).toEqual([expect.objectContaining({ field: "why" })]);
  });
  it("requires measurable lag: target must differ from start", () => {
    expect(validateNewGoal(0, { ...base, lagStart: 100, lagTarget: 100 }))
      .toEqual([expect.objectContaining({ field: "lagTarget" })]);
  });
  it("requires finite numbers", () => {
    expect(validateNewGoal(0, { ...base, lagStart: Number.NaN })).toEqual([expect.objectContaining({ field: "lagStart" })]);
  });
  it("deadline must be a week 1-12", () => {
    expect(validateNewGoal(0, { ...base, deadlineWeek: 13 })).toEqual([expect.objectContaining({ field: "deadlineWeek" })]);
    expect(validateNewGoal(0, { ...base, deadlineWeek: 0 })).toEqual([expect.objectContaining({ field: "deadlineWeek" })]);
  });
});

describe("validateNewTactic", () => {
  it("accepts verb-first sentences with a valid pattern", () => {
    expect(validateNewTactic({ text: "Perform 30-min strength training 3x per week", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } })).toEqual([]);
    expect(validateNewTactic({ text: "Launch landing page", duePattern: { type: "SPECIFIC_WEEKS", weeks: [3] } })).toEqual([]);
  });
  it("rejects empty/blank/too-long text", () => {
    expect(validateNewTactic({ text: "  ", duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } })).toEqual([expect.objectContaining({ field: "text" })]);
    expect(validateNewTactic({ text: "x".repeat(201), duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } })).toEqual([expect.objectContaining({ field: "text" })]);
  });
  it("rejects invalid due patterns", () => {
    expect(validateNewTactic({ text: "Do it", duePattern: { type: "EVERY_WEEK", timesPerWeek: 0 } })).toEqual([expect.objectContaining({ field: "duePattern" })]);
    expect(validateNewTactic({ text: "Do it", duePattern: { type: "SPECIFIC_WEEKS", weeks: [] } })).toEqual([expect.objectContaining({ field: "duePattern" })]);
    expect(validateNewTactic({ text: "Do it", duePattern: { type: "SPECIFIC_WEEKS", weeks: [13] } })).toEqual([expect.objectContaining({ field: "duePattern" })]);
    expect(validateNewTactic({ text: "Do it", duePattern: { type: "NOPE" } as unknown as DuePattern })).toEqual([expect.objectContaining({ field: "duePattern" })]);
  });
});

describe("nextRitual", () => {
  const mk = (o: Partial<RitualState>): RitualState => ({
    hasActiveCycle: false, cycleStatus: "active", currentWeek: 1, hasCurrentWeekPlan: false,
    lastWeekPlanClosed: true, reviewWeek: false, ...o,
  });
  it("orders the weekly loop like the book: close before plan, plan before execute", () => {
    expect(nextRitual(mk({}))).toBe("create_cycle");
    expect(nextRitual(mk({ hasActiveCycle: true, cycleStatus: "planning" }))).toBe("start_cycle");
    expect(nextRitual(mk({ hasActiveCycle: true, currentWeek: 3, lastWeekPlanClosed: false }))).toBe("close_last_week");
    expect(nextRitual(mk({ hasActiveCycle: true, currentWeek: 3, hasCurrentWeekPlan: false }))).toBe("plan_week");
    expect(nextRitual(mk({ hasActiveCycle: true, currentWeek: 3, hasCurrentWeekPlan: true }))).toBe("execute_today");
    expect(nextRitual(mk({ hasActiveCycle: true, currentWeek: 3, hasCurrentWeekPlan: true, lastWeekPlanClosed: false }))).toBe("close_last_week");
    expect(nextRitual(mk({ hasActiveCycle: true, reviewWeek: true }))).toBe("review_mode");
  });
});
