"use client";

import type { WeekPlanItemDto } from "@/lib/contracts";
import PlanItemCard from "./PlanItemCard";

interface DayColumnProps {
  dayOfWeek: number;
  dayName: string;
  dateStr: string;
  items: WeekPlanItemDto[];
  isClosed: boolean;
  onMoveDay: (itemId: number, newDay: number) => Promise<void>;
  onRename: (itemId: number, newLabel: string) => Promise<void>;
  onRemove: (itemId: number) => Promise<void>;
}

export default function DayColumn({
  dayName,
  dateStr,
  items,
  isClosed,
  onMoveDay,
  onRename,
  onRemove,
}: DayColumnProps) {
  const completed = items.filter((i) => i.done >= i.plannedCount).length;
  const total = items.length;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-3 shadow-2xs min-w-[160px] flex-1">
      {/* Column Header */}
      <div className="border-b border-slate-200/80 pb-2.5 mb-2.5 flex items-baseline justify-between">
        <div>
          <span className="text-xs font-bold text-slate-900 block">{dayName}</span>
          <span className="text-[10px] text-slate-400 font-medium">{dateStr}</span>
        </div>
        <span className="text-[10px] font-bold text-slate-500 rounded bg-white border border-slate-200 px-1.5 py-0.5">
          {completed}/{total}
        </span>
      </div>

      {/* Item list */}
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[500px] pr-0.5">
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 italic">—</div>
        ) : (
          items.map((item) => (
            <PlanItemCard
              key={item.id}
              item={item}
              isClosed={isClosed}
              onMoveDay={onMoveDay}
              onRename={onRename}
              onRemove={onRemove}
            />
          ))
        )}
      </div>
    </div>
  );
}
