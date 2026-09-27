"use client";

import { useState } from "react";
import type { WeekPlanItemDto } from "@/lib/contracts";
import TodayItem from "./TodayItem";

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
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
  // Past days collapsed by default; today and future days expanded
  const [collapsed, setCollapsed] = useState(isPast && !isToday);

  const completedCount = items.filter((i) => i.done >= i.plannedCount).length;
  const totalCount = items.length;

  return (
    <section id={`day-section-${dayOfWeek}`} className="scroll-mt-6 space-y-2">
      <div
        onClick={() => setCollapsed(!collapsed)}
        className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition select-none ${
          isToday
            ? "bg-slate-900 text-white"
            : "bg-slate-100 hover:bg-slate-200 text-slate-800"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold">
            {DAY_NAMES[dayOfWeek]} &middot; {date}
          </span>
          {isToday && (
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300 uppercase">
              Today
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-medium ${
              isToday ? "text-slate-300" : "text-slate-500"
            }`}
          >
            {completedCount}/{totalCount} done
          </span>
          <span className={`text-xs ${isToday ? "text-slate-400" : "text-slate-500"}`}>
            {collapsed ? "Expand ▼" : "Collapse ▲"}
          </span>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-2.5 pl-1 sm:pl-2">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 italic">
              Nothing placed on this day — move items in the Weekly Plan.
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
