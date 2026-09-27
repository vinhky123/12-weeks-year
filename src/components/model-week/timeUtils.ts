import type { BlockType } from "@/lib/contracts";

export const DAYS = [
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
  "Chủ Nhật",
];

export const DAY_ABBRS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

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
    name: "Chiến lược",
    badgeBg: "bg-zinc-200 dark:bg-zinc-800",
    badgeText: "text-zinc-900 dark:text-zinc-100",
    border: "border-zinc-300 dark:border-zinc-700",
    cardBg: "bg-white dark:bg-zinc-900",
    hint: "3 giờ tập trung không gián đoạn — công việc quan trọng nhất.",
  },
  BUFFER: {
    name: "Đệm / Phụ",
    badgeBg: "bg-zinc-100 dark:bg-zinc-800/60",
    badgeText: "text-zinc-600 dark:text-zinc-300",
    border: "border-zinc-200 dark:border-zinc-800",
    cardBg: "bg-zinc-50/70 dark:bg-zinc-900/40",
    hint: "30–60 phút mỗi ngày cho email và việc quản trị phát sinh.",
  },
  BREAKOUT: {
    name: "Nghỉ ngơi",
    badgeBg: "bg-zinc-200 dark:bg-zinc-800",
    badgeText: "text-zinc-800 dark:text-zinc-200",
    border: "border-zinc-300 dark:border-zinc-700",
    cardBg: "bg-white dark:bg-zinc-900",
    hint: "3+ giờ hoàn toàn rời khỏi công việc để tái tạo năng lượng.",
  },
  PLANNING: {
    name: "Lập kế hoạch",
    badgeBg: "bg-zinc-200 dark:bg-zinc-800",
    badgeText: "text-zinc-900 dark:text-zinc-100",
    border: "border-zinc-300 dark:border-zinc-700",
    cardBg: "bg-white dark:bg-zinc-900",
    hint: "15–20 phút hàng tuần: chấm điểm, rồi lên kế hoạch tuần mới.",
  },
  WAM: {
    name: "Họp WAM",
    badgeBg: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
    badgeText: "text-white dark:text-zinc-900",
    border: "border-zinc-400 dark:border-zinc-600",
    cardBg: "bg-white dark:bg-zinc-900",
    hint: "Phiên giải trình trách nhiệm — tuần làm việc chính là một hạn chót.",
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
