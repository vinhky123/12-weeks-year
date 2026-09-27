"use client";

import React from "react";
import type { WeekPlanItemDto } from "@/lib/contracts";
import DayColumn from "./DayColumn";
import { useSettings } from "@/context/SettingsContext";

const EN_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const VI_DAYS = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

interface WeekBoardProps {
  weekStart: string;
  items: WeekPlanItemDto[];
  isClosed: boolean;
  onMoveDay: (itemId: number, newDay: number) => Promise<void>;
  onRename: (itemId: number, newLabel: string) => Promise<void>;
  onRemove: (itemId: number) => Promise<void>;
}

export default function WeekBoard({
  weekStart,
  items,
  isClosed,
  onMoveDay,
  onRename,
  onRemove,
}: WeekBoardProps) {
  const { locale } = useSettings();
  const startDate = new Date(weekStart);

  const getDayDate = (dayOffset: number): string => {
    if (isNaN(startDate.getTime())) return "";
    const d = new Date(startDate);
    d.setDate(d.getDate() + dayOffset);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const days = locale === "vi" ? VI_DAYS : EN_DAYS;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span className="italic">
          {locale === "vi"
            ? "Các đầu việc bắt đầu từ Thứ Hai — hãy chuyển sang các ngày bạn dự định thực hiện (Items start on Monday — move them to the days you’ll do them)."
            : "Items start on Monday — move them to the days you’ll do them."}
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 pt-1">
        {days.map((dayName, dayIndex) => {
          const dayItems = items.filter((i) => i.dayOfWeek === dayIndex);
          return (
            <DayColumn
              key={dayName}
              dayOfWeek={dayIndex}
              dayName={dayName}
              dateStr={getDayDate(dayIndex)}
              items={dayItems}
              isClosed={isClosed}
              onMoveDay={onMoveDay}
              onRename={onRename}
              onRemove={onRemove}
            />
          );
        })}
      </div>
    </div>
  );
}
