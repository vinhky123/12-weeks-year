import { describe, expect, it } from "vitest";
import { completionRequestForOccurrence, occurrenceCompletionDate, withOccurrenceDone } from "./occurrenceUiRules";

describe("occurrence UI rules", () => {
  it("builds a completion request with the selected item ID", () => {
    expect(completionRequestForOccurrence({ id: 23, tacticId: 7 }, 4)).toEqual({
      tacticId: 7, weekNumber: 4, weekPlanItemId: 23,
    });
  });

  it("includes an explicitly selected date for historical completion actions", () => {
    expect(completionRequestForOccurrence({ id: 23, tacticId: 7 }, 4, "2026-10-07")).toEqual({
      tacticId: 7, weekNumber: 4, weekPlanItemId: 23, date: "2026-10-07",
    });
  });

  it("defaults the completion date to the scheduled day, capped at the latest allowed date", () => {
    expect(occurrenceCompletionDate("2026-10-05", 2, "2026-10-10")).toBe("2026-10-07");
    expect(occurrenceCompletionDate("2026-10-05", 6, "2026-10-10")).toBe("2026-10-10");
  });

  it("updates only the selected row when sibling occurrences share a tactic", () => {
    const items = [
      { id: 1, tacticId: 7, done: 0, plannedCount: 1 },
      { id: 2, tacticId: 7, done: 0, plannedCount: 1 },
    ];

    expect(withOccurrenceDone(items, 2, 1)).toEqual([
      { id: 1, tacticId: 7, done: 0, plannedCount: 1 },
      { id: 2, tacticId: 7, done: 1, plannedCount: 1 },
    ]);
  });

  it("returns no tactic completion request for a manual plan item", () => {
    expect(completionRequestForOccurrence({ id: 3, tacticId: null }, 2)).toBeNull();
  });
});
