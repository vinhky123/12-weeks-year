import { describe, expect, it } from "vitest";
import { validateModelWeek, type BlockTypeLike } from "./modelWeekRules";

const block = (type: BlockTypeLike, durationMinutes = 60) => ({ type, durationMinutes });

describe("validateModelWeek (book-quantity nudges)", () => {
  it("warns about everything on an empty week", () => {
    const warnings = validateModelWeek([]);
    const fields = warnings.map((w) => w.field);
    expect(fields).toContain("STRATEGIC");
    expect(fields).toContain("BREAKOUT");
    expect(fields).toContain("PLANNING");
    expect(fields).toContain("WAM");
    expect(fields).toContain("BUFFER");
  });

  it("accepts the book's model week with no warnings", () => {
    const warnings = validateModelWeek([
      block("STRATEGIC", 180),
      block("BUFFER", 45), block("BUFFER", 45),
      block("BREAKOUT", 240),
      block("PLANNING", 20),
      block("WAM", 30),
    ]);
    expect(warnings).toEqual([]);
  });

  it("a too-short strategic block does not count (must be 3 hours)", () => {
    const warnings = validateModelWeek([block("STRATEGIC", 120), block("PLANNING", 20), block("WAM", 30), block("BUFFER", 30), block("BREAKOUT", 180)]);
    expect(warnings.map((w) => w.field)).toContain("STRATEGIC");
    expect(validateModelWeek([block("STRATEGIC", 180), block("PLANNING", 20), block("WAM", 30), block("BUFFER", 30), block("BREAKOUT", 180)])).toEqual([]);
  });

  it("breakout must be 3h+ to count", () => {
    const warnings = validateModelWeek([block("STRATEGIC", 180), block("BREAKOUT", 60)]);
    expect(warnings.map((w) => w.field)).toContain("BREAKOUT");
  });

  it("multiple buffers satisfy the buffer nudge", () => {
    const warnings = validateModelWeek([block("BUFFER", 30), block("BUFFER", 30)]);
    expect(warnings.map((w) => w.field)).not.toContain("BUFFER");
  });
});
