"use client";

import type { WeekPlanItemDto } from "@/lib/contracts";
import DayColumn from "./DayColumn";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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
  // Compute date strings for each day of the week from weekStart
  const startDate = new Date(weekStart);

  const getDayDate = (dayOffset: number): string => {
    if (isNaN(startDate.getTime())) return "";
    const d = new Date(startDate);
    d.setDate(d.getDate() + dayOffset);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="italic">
          Items start on Monday — move them to the days you&rsquo;ll do them.
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 pt-1">
        {DAYS.map((dayName, dayIndex) => {
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
