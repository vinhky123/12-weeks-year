// Pure cycle/date math for The 12 Week Year.
// Date-only 'YYYY-MM-DD' arithmetic uses UTC so results never depend on the
// machine's timezone. todayIso() formats its injected clock instant in the
// requested local timezone (or the host timezone when none is requested).

export const WEEKS_IN_CYCLE = 12 as const;
export const REVIEW_WEEK = 13 as const;

const MS_PER_DAY = 86_400_000;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse a YYYY-MM-DD string to UTC ms, rejecting malformed and rollover dates. */
export function toUtcMs(iso: string): number {
  const match = ISO_DATE.exec(iso);
  if (!match) throw new Error(`Invalid date string: ${iso} (expected YYYY-MM-DD)`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const ms = Date.UTC(year, month - 1, day);
  const back = new Date(ms);
  if (
    back.getUTCFullYear() !== year ||
    back.getUTCMonth() !== month - 1 ||
    back.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: ${iso}`);
  }
  return ms;
}

export function toIsoDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Current local calendar date; `now` and `timeZone` are injectable for testability. */
export function todayIso(now: Date = new Date(), timeZone?: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(now);
  const value = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)!.value.padStart(type === "year" ? 4 : 2, "0");
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function addDays(iso: string, days: number): string {
  return toIsoDate(toUtcMs(iso) + days * MS_PER_DAY);
}

/** Signed whole-day difference from -> to. */
export function diffDays(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

/** The Monday strictly after `from` (default cycle start date). */
export function nextMonday(from: string): string {
  const dayOfWeek = new Date(toUtcMs(from)).getUTCDay(); // 0 = Sunday
  const delta = ((1 - dayOfWeek + 7) % 7) || 7;
  return addDays(from, delta);
}

/** First calendar day of execution week `week` (1-12) or the review week (13). */
export function weekStart(cycleStart: string, week: number): string {
  if (!Number.isInteger(week) || week < 1 || week > REVIEW_WEEK) {
    throw new RangeError(`week must be an integer between 1 and ${REVIEW_WEEK}, got ${week}`);
  }
  return addDays(cycleStart, (week - 1) * 7);
}

/** Last calendar day (inclusive) of the given week. */
export function weekEnd(cycleStart: string, week: number): string {
  return addDays(weekStart(cycleStart, week), 6);
}

/** 0 = before start · 1-12 = execution week · 13 = review week · 14 = after. */
export function cycleWeekNumber(today: string, cycleStart: string): number {
  const offset = diffDays(cycleStart, today);
  if (offset < 0) return 0;
  const week = Math.floor(offset / 7) + 1;
  if (week <= WEEKS_IN_CYCLE) return week;
  if (week === REVIEW_WEEK) return REVIEW_WEEK;
  return 14;
}

/** Whole execution days left including today, through end of week 12. Never negative; 0 before the cycle starts. */
export function daysRemainingInExecution(today: string, cycleStart: string): number {
  if (diffDays(cycleStart, today) < 0) return 0;
  const end = weekEnd(cycleStart, WEEKS_IN_CYCLE);
  return Math.max(0, diffDays(today, end) + 1);
}

/** UI label like "Week 4 · Day 2"; null outside execution weeks. */
export function weekAndDayLabel(today: string, cycleStart: string): string | null {
  const week = cycleWeekNumber(today, cycleStart);
  if (week < 1 || week > WEEKS_IN_CYCLE) return null;
  const dayInWeek = (diffDays(cycleStart, today) % 7) + 1;
  return `Week ${week} · Day ${dayInWeek}`;
}
