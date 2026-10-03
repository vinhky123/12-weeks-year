import { describe, expect, it } from "vitest";
import {
  WEEKS_IN_CYCLE, REVIEW_WEEK, addDays, cycleWeekNumber, daysRemainingInExecution,
  diffDays, nextMonday, toIsoDate, todayIso, weekAndDayLabel, weekEnd, weekStart,
} from "./cycleMath";

const START = "2026-10-05"; // a Monday

describe("date helpers", () => {
  it("adds days across month/year boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("diffDays is signed day count", () => {
    expect(diffDays("2026-10-05", "2026-10-05")).toBe(0);
    expect(diffDays("2026-10-05", "2026-10-11")).toBe(6);
    expect(diffDays("2026-10-11", "2026-10-05")).toBe(-6);
  });
  it("todayIso formats the host's local calendar date by default", () => {
    expect(todayIso(new Date(2026, 9, 5, 0, 30))).toBe("2026-10-05");
  });
  it("todayIso formats an injected instant in an explicit time zone", () => {
    expect(todayIso(new Date("2026-10-04T17:30:00Z"), "Asia/Ho_Chi_Minh")).toBe("2026-10-05");
    expect(todayIso(new Date("2026-10-04T16:59:00Z"), "Asia/Ho_Chi_Minh")).toBe("2026-10-04");
    expect(todayIso(new Date("2026-12-31T17:30:00Z"), "Asia/Ho_Chi_Minh")).toBe("2027-01-01");
    expect(todayIso(new Date("2026-10-04T17:30:00Z"), "UTC")).toBe("2026-10-04");
  });
  it("todayIso respects New York's spring daylight-saving transition", () => {
    expect(todayIso(new Date("2026-03-08T04:30:00Z"), "America/New_York")).toBe("2026-03-07");
    expect(todayIso(new Date("2026-03-08T07:30:00Z"), "America/New_York")).toBe("2026-03-08");
  });
  it("uses the local calendar date in cycle week arithmetic", () => {
    const today = todayIso(new Date("2026-10-04T17:30:00Z"), "Asia/Ho_Chi_Minh");
    expect(cycleWeekNumber(today, START)).toBe(1);
  });
  it("rejects malformed and rollover dates", () => {
    expect(() => addDays("2026-2-3", 1)).toThrow();
    expect(() => addDays("2026-02-30", 1)).toThrow();
    expect(() => diffDays("nonsense", "2026-01-01")).toThrow();
  });
  it("toIsoDate round-trips", () => {
    expect(toIsoDate(Date.UTC(2026, 0, 31))).toBe("2026-01-31");
  });
});

describe("nextMonday", () => {
  it("returns the strictly next Monday", () => {
    expect(nextMonday("2026-10-05")).toBe("2026-10-12"); // Monday -> next Monday
    expect(nextMonday("2026-10-07")).toBe("2026-10-12"); // Wednesday
    expect(nextMonday("2026-10-11")).toBe("2026-10-12"); // Sunday
  });
});

describe("weekStart/weekEnd", () => {
  it("week 1 starts at cycleStart and spans 7 days", () => {
    expect(weekStart(START, 1)).toBe(START);
    expect(weekEnd(START, 1)).toBe("2026-10-11");
  });
  it("week N starts at +7*(N-1)", () => {
    expect(weekStart(START, 12)).toBe("2026-12-21");
    expect(weekEnd(START, 12)).toBe("2026-12-27");
    expect(weekStart(START, 13)).toBe("2026-12-28");
  });
  it("works with mid-week starts", () => {
    expect(weekStart("2026-10-07", 2)).toBe("2026-10-14");
    expect(weekEnd("2026-10-07", 2)).toBe("2026-10-20");
  });
  it("rejects week 0 and week 14", () => {
    expect(() => weekStart(START, 0)).toThrow(RangeError);
    expect(() => weekStart(START, 14)).toThrow(RangeError);
  });
});

describe("cycleWeekNumber", () => {
  it("is 0 before the cycle starts", () => {
    expect(cycleWeekNumber("2026-10-04", START)).toBe(0);
  });
  it("walks the execution weeks on boundaries", () => {
    expect(cycleWeekNumber(START, START)).toBe(1);
    expect(cycleWeekNumber("2026-10-11", START)).toBe(1);
    expect(cycleWeekNumber("2026-10-12", START)).toBe(2);
    expect(cycleWeekNumber("2026-12-21", START)).toBe(12);
    expect(cycleWeekNumber("2026-12-27", START)).toBe(12);
    expect(cycleWeekNumber("2026-12-28", START)).toBe(REVIEW_WEEK);
    expect(cycleWeekNumber("2027-01-03", START)).toBe(REVIEW_WEEK);
    expect(cycleWeekNumber("2027-01-04", START)).toBe(14);
  });
  it("mid-week cycle start still yields clean weeks", () => {
    expect(cycleWeekNumber("2026-10-07", "2026-10-07")).toBe(1);
    expect(cycleWeekNumber("2026-10-13", "2026-10-07")).toBe(1);
    expect(cycleWeekNumber("2026-10-14", "2026-10-07")).toBe(2);
  });
});

describe("daysRemainingInExecution", () => {
  it("counts today inclusive through end of week 12", () => {
    expect(daysRemainingInExecution(START, START)).toBe(84);
    expect(daysRemainingInExecution("2026-12-27", START)).toBe(1);
    expect(daysRemainingInExecution("2026-12-28", START)).toBe(0);
    expect(daysRemainingInExecution("2025-01-01", START)).toBe(0);
  });
});

describe("weekAndDayLabel", () => {
  it("labels execution days", () => {
    expect(weekAndDayLabel(START, START)).toBe("Week 1 · Day 1");
    expect(weekAndDayLabel("2026-10-11", START)).toBe("Week 1 · Day 7");
    expect(weekAndDayLabel("2026-10-12", START)).toBe("Week 2 · Day 1");
  });
  it("is null outside execution weeks", () => {
    expect(weekAndDayLabel("2026-10-04", START)).toBeNull();
    expect(weekAndDayLabel("2026-12-28", START)).toBeNull();
  });
});

describe("book constants", () => {
  it("a year is 12 weeks plus a review week", () => {
    expect(WEEKS_IN_CYCLE).toBe(12);
    expect(REVIEW_WEEK).toBe(13);
  });
});
