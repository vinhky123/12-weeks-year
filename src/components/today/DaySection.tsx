"use client";

import React, { useState } from "react";
import type { WeekPlanItemDto } from "@/lib/contracts";
import TodayItem from "./TodayItem";
import { useSettings } from "@/context/SettingsContext";

const EN_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const VI_DAYS = [
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
  "Chủ Nhật",
];

interface DaySectionProps {
  dayOfWeek: number;
  date: string;
  items: WeekPlanItemDto[];
  isToday: boolean;
  isPast: boolean;
  isClosed: boolean;
  onIncrement: (item: WeekPlanItemDto) => void;
  onDecrement: (item: WeekPlanItemDto) => void;
  mutatingItemId: number | null;
}

export default function DaySection({
  dayOfWeek,
  date,
  items,
  isToday,
  isPast,
  isClosed,
  onIncrement,
  onDecrement,
  mutatingItemId,
}: DaySectionProps) {
  const { locale } = useSettings();
  const [collapsed, setCollapsed] = useState(isPast && !isToday);

  const completedCount = items.filter((i) => i.done >= i.plannedCount).length;
  const totalCount = items.length;

  const dayName = locale === "vi" ? VI_DAYS[dayOfWeek] : EN_DAYS[dayOfWeek];

  return (
    <section id={`day-section-${dayOfWeek}`} className="scroll-mt-6 space-y-2">
      <div
        onClick={() => setCollapsed(!collapsed)}
        className={`flex items-center justify-between rounded-lg px-3.5 py-2.5 cursor-pointer transition select-none ${
          isToday
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 dark:text-zinc-200"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold">
            {dayName} &middot; {date}
          </span>
          {isToday && (
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                isToday
                  ? "bg-zinc-800 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900"
                  : ""
              }`}
            >
              {locale === "vi" ? "Hôm nay" : "Today"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-medium ${
              isToday
                ? "text-zinc-300 dark:text-zinc-600"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {completedCount}/{totalCount} {locale === "vi" ? "hoàn thành" : "done"}
          </span>
          <span
            className={`text-xs ${
              isToday
                ? "text-zinc-400 dark:text-zinc-500"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {collapsed
              ? locale === "vi"
                ? "Mở rộng ▼"
                : "Expand ▼"
              : locale === "vi"
              ? "Thu gọn ▲"
              : "Collapse ▲"}
          </span>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-2.5 pl-1 sm:pl-2">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400 italic dark:border-zinc-800 dark:text-zinc-500">
              {locale === "vi"
                ? "Chưa có hành động nào cho ngày này — bạn có thể thêm và xếp lịch trong Kế hoạch tuần."
                : "Nothing placed on this day — move items in the Weekly Plan."}
            </div>
          ) : (
            items.map((item) => (
              <TodayItem
                key={item.id}
                item={item}
                isClosed={isClosed}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                isMutating={mutatingItemId === item.id}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
