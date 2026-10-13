export interface OccurrenceRef {
  id: number;
  tacticId: number | null;
}

export function completionRequestForOccurrence(item: OccurrenceRef, weekNumber: number, date?: string) {
  if (item.tacticId === null) return null;
  return { tacticId: item.tacticId, weekNumber, weekPlanItemId: item.id, ...(date ? { date } : {}) };
}

export function occurrenceCompletionDate(weekStart: string, dayOfWeek: number, latestDate: string): string {
  const date = new Date(`${weekStart}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayOfWeek);
  const plannedDate = date.toISOString().slice(0, 10);
  return plannedDate > latestDate ? latestDate : plannedDate;
}

export function occurrenceWeekEnd(weekStart: string): string {
  const date = new Date(`${weekStart}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
}

export function withOccurrenceDone<T extends { id: number; done: number }>(items: T[], itemId: number, done: number): T[] {
  return items.map((item) => item.id === itemId ? { ...item, done } : item);
}
