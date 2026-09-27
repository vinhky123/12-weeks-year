import type { BlockType } from "@/lib/contracts";

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const DAY_ABBRS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const BLOCK_TYPE_CONFIG: Record<
  BlockType,
  {
    name: string;
    badgeBg: string;
    badgeText: string;
    border: string;
    cardBg: string;
    hint: string;
  }
> = {
  STRATEGIC: {
    name: "Strategic",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
    border: "border-emerald-300",
    cardBg: "bg-emerald-50/70",
    hint: "3 hours, uninterrupted — your most important work.",
  },
  BUFFER: {
    name: "Buffer",
    badgeBg: "bg-slate-200",
    badgeText: "text-slate-800",
    border: "border-slate-300",
    cardBg: "bg-slate-100/70",
    hint: "30–60 min daily for email and admin.",
  },
  BREAKOUT: {
    name: "Breakout",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-800",
    border: "border-sky-300",
    cardBg: "bg-sky-50/70",
    hint: "3+ hours fully away from work.",
  },
  PLANNING: {
    name: "Planning",
    badgeBg: "bg-violet-100",
    badgeText: "text-violet-800",
    border: "border-violet-300",
    cardBg: "bg-violet-50/70",
    hint: "15–20 min weekly: score, then plan.",
  },
  WAM: {
    name: "WAM",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
    border: "border-amber-300",
    cardBg: "bg-amber-50/70",
    hint: "Your accountability meeting — the week itself is a deadline.",
  },
};

export function minuteToTimeStr(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeStrToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatTimeRange(startMinute: number, durationMinutes: number): string {
  const start = minuteToTimeStr(startMinute);
  const end = minuteToTimeStr(startMinute + durationMinutes);
  return `${start}–${end}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
