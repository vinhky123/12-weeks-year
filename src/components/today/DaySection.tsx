"use client";

import React, { useId, useState } from "react";
import type { WeekPlanItemDto } from "@/lib/contracts";
import TodayItem from "./TodayItem";
import { useSettings } from "@/context/SettingsContext";

const EN_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const VI_DAYS = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

interface DaySectionProps {
  dayOfWeek: number;
  date: string;
  items: WeekPlanItemDto[];
  isToday: boolean;
  isClosed: boolean;
  onIncrement: (item: WeekPlanItemDto) => void;
  onDecrement: (item: WeekPlanItemDto) => void;
  mutatingItemId: number | null;
  defaultCollapsed?: boolean;
  sectionId?: string;
}

export default function DaySection({
  dayOfWeek, date, items, isToday, isClosed, onIncrement, onDecrement,
  mutatingItemId, defaultCollapsed = false, sectionId,
}: DaySectionProps) {
  const { locale } = useSettings();
  const generatedId = useId();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const contentId = `${sectionId ?? `day-${dayOfWeek}`}-${generatedId.replace(/:/g, "")}-content`;
  const completedCount = items.filter((item) => item.done >= item.plannedCount).length;
  const dayName = (locale === "vi" ? VI_DAYS : EN_DAYS)[dayOfWeek];

  return (
    <section id={sectionId} className="scroll-mt-6 space-y-2">
      <button
        type="button"
        aria-expanded={!collapsed}
        aria-controls={contentId}
        onClick={() => setCollapsed((current) => !current)}
        className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-left transition ${
          isToday
            ? "bg-teal-700 text-white hover:bg-teal-600 dark:bg-teal-400 dark:text-zinc-950 dark:hover:bg-teal-300"
            : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700/80"
        }`}
      >
        <span className="flex min-w-0 flex-wrap items-center gap-2.5">
          <span className="text-sm font-bold">{dayName} · {date}</span>
          {isToday && <span className="rounded bg-teal-800 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white dark:bg-teal-200 dark:text-zinc-950">{locale === "vi" ? "Hôm nay" : "Today"}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs font-medium">
          <span>{completedCount}/{items.length} {locale === "vi" ? "hoàn thành" : "done"}</span>
          <span aria-hidden="true">{collapsed ? "▼" : "▲"}</span>
        </span>
      </button>
      <div id={contentId} hidden={collapsed} className="space-y-2.5 sm:pl-2">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            {locale === "vi" ? "Không có việc nào cho ngày này." : "No work planned for this day."}
          </div>
        ) : items.map((item) => (
          <TodayItem key={item.id} item={item} isClosed={isClosed} onIncrement={onIncrement} onDecrement={onDecrement} isMutating={mutatingItemId !== null} />
        ))}
      </div>
    </section>
  );
}
