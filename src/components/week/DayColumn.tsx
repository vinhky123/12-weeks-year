"use client";

import React from "react";
import type { WeekPlanItemDto } from "@/lib/contracts";
import { useSettings } from "@/context/SettingsContext";
import PlanItemCard from "./PlanItemCard";

interface DayColumnProps {
  dayOfWeek: number;
  dayName: string;
  dateStr: string;
  weekStart: string;
  todayDate: string;
  completionDateRequired: boolean;
  items: WeekPlanItemDto[];
  isClosed: boolean;
  mutationPending?: boolean;
  onMoveDay: (itemId: number, newDay: number) => Promise<void>;
  onRename: (itemId: number, newLabel: string) => Promise<void>;
  onRemove: (itemId: number) => Promise<void>;
  onToggleComplete: (item: WeekPlanItemDto, date?: string) => Promise<void>;
}
export default function DayColumn({
  dayName,
  dateStr,
  weekStart,
  todayDate,
  completionDateRequired,
  items,
  isClosed,
  mutationPending = false,
  onMoveDay,
  onRename,
  onRemove,
  onToggleComplete,
}: DayColumnProps) {
  const { locale } = useSettings();
  const completed = items.filter((item) => item.done >= item.plannedCount).length;
  const headingId = `week-day-${dayName.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <section
      aria-labelledby={headingId}
      className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/60"
    >
      <header className="mb-3 flex items-start justify-between gap-3 border-b border-zinc-200/80 pb-3 dark:border-zinc-800">
        <div className="min-w-0">
          <h2 id={headingId} className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {dayName}
          </h2>
          {dateStr ? <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{dateStr}</p> : null}
        </div>
        <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {completed}/{items.length}
        </span>
      </header>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-6 text-center text-sm leading-5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {locale === "vi" ? "Chưa có công việc cho ngày này." : "No tasks planned for this day."}
          </p>
        ) : (
          items.map((item) => (
            <PlanItemCard
              key={item.id}
              item={item}
              weekStart={weekStart}
              todayDate={todayDate}
              completionDateRequired={completionDateRequired}
              isClosed={isClosed}
              mutationPending={mutationPending}
              onMoveDay={onMoveDay}
              onRename={onRename}
              onRemove={onRemove}
              onToggleComplete={onToggleComplete}
            />
          ))
        )}
      </div>
    </section>
  );
}
