import { describe, expect, it } from "vitest";
import { DUE_PATTERN_SCHEMA } from "./contracts";
import { EXAMPLE_GOALS, EXAMPLE_WEEK1_ITEMS } from "./example-plan";

describe("worked example data (book-faithful shape)", () => {
  it("at most 3 goals (the vital few), each with 1+ tactics", () => {
    expect(EXAMPLE_GOALS.length).toBeLessThanOrEqual(3);
    expect(EXAMPLE_GOALS.length).toBeGreaterThanOrEqual(1);
    for (const g of EXAMPLE_GOALS) expect(g.tactics.length).toBeGreaterThanOrEqual(1);
  });

  it("every due pattern is a valid DuePattern", () => {
    for (const g of EXAMPLE_GOALS) {
      for (const t of g.tactics) expect(() => DUE_PATTERN_SCHEMA.parse(t.duePattern)).not.toThrow();
    }
  });

  it("every bilingual field has non-empty en and vi", () => {
    const check = (b: { en: string; vi: string }) => expect(b.en.trim().length && b.vi.trim().length).toBeGreaterThan(0);
    for (const g of EXAMPLE_GOALS) {
      check(g.title); check(g.why);
      for (const t of g.tactics) check(t.text);
    }
    for (const i of EXAMPLE_WEEK1_ITEMS) {
      check(i.label);
      expect(i.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(i.dayOfWeek).toBeLessThanOrEqual(6);
    }
  });
});
