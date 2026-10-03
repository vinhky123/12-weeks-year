"use client";

import React from "react";
import type { WeekPlanItemDto } from "@/lib/contracts";
import { useSettings } from "@/context/SettingsContext";
import DayColumn from "./DayColumn";

const EN_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const VI_DAYS = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

interface WeekBoardProps {
  weekStart: string;
  items: WeekPlanItemDto[];
  isClosed: boolean;
  mutationPending?: boolean;
  onMoveDay: (itemId: number, newDay: number) => Promise<void>;
  onRename: (itemId: number, newLabel: string) => Promise<void>;
  onRemove: (itemId: number) => Promise<void>;
}
export default function WeekBoard({
  weekStart,
  items,
  isClosed,
  mutationPending = false,
  onMoveDay,
  onRename,
  onRemove,
}: WeekBoardProps) {
  const { locale } = useSettings();
  const startDate = new Date(`${weekStart}T00:00:00Z`);
  const days = locale === "vi" ? VI_DAYS : EN_DAYS;

  const getDayDate = (dayOffset: number): string => {
    if (Number.isNaN(startDate.getTime())) return "";

    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + dayOffset);
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
  };

  return (
    <section className="space-y-4" aria-label={locale === "vi" ? "Lịch tuần" : "Weekly schedule"}>
      {!isClosed && (
        <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {locale === "vi"
            ? "Các công việc bắt đầu vào Thứ Hai. Chuyển chúng sang ngày bạn dự định thực hiện."
            : "Tasks start on Monday. Move them to the day you plan to do them."}
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {days.map((dayName, dayIndex) => {
          const dayItems = items.filter((item) => item.dayOfWeek === dayIndex);

          return (
            <DayColumn
              key={dayName}
              dayOfWeek={dayIndex}
              dayName={dayName}
              dateStr={getDayDate(dayIndex)}
              items={dayItems}
              isClosed={isClosed}
              mutationPending={mutationPending}
              onMoveDay={onMoveDay}
              onRename={onRename}
              onRemove={onRemove}
            />
          );
        })}
      </div>
    </section>
  );
}
