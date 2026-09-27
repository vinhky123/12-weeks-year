"use client";

import type { BlockTemplateDto } from "@/lib/contracts";
import { DAYS, DAY_ABBRS } from "./timeUtils";
import { BlockCard } from "./BlockCard";

interface ModelWeekGridProps {
  blocks: BlockTemplateDto[];
  onAddBlock: (dayOfWeek: number) => void;
  onEditBlock: (block: BlockTemplateDto) => void;
  onDeleteBlock: (id: number) => void;
  disabled?: boolean;
}

export function ModelWeekGrid({
  blocks,
  onAddBlock,
  onEditBlock,
  onDeleteBlock,
  disabled = false,
}: ModelWeekGridProps) {
  // Group blocks by day of week (0 to 6)
  const blocksByDay = Array.from({ length: 7 }, (_, day) => {
    return blocks
      .filter((b) => b.dayOfWeek === day)
      .sort((a, b) => a.startMinute - b.startMinute);
  });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
      {blocksByDay.map((dayBlocks, dayIndex) => {
        const dayName = DAYS[dayIndex];
        const dayAbbr = DAY_ABBRS[dayIndex];
        const isWeekend = dayIndex === 5 || dayIndex === 6;

        return (
          <div
            key={dayIndex}
            className={`flex flex-col rounded-xl border p-3 min-h-[380px] shadow-xs ${
              isWeekend
                ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60"
                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
            }`}
          >
            {/* Day Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-2 mb-3">
              <div>
                <span className="font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  {dayAbbr}
                </span>
                <span className="ml-1 text-[11px] text-zinc-400 dark:text-zinc-500 font-medium hidden sm:inline">
                  {dayName.slice(3)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onAddBlock(dayIndex)}
                disabled={disabled}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-50"
                title={`Thêm khung giờ cho ${dayName}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Block List */}
            <div className="flex-1 space-y-2.5">
              {dayBlocks.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 p-2 text-center">
                  <span className="text-[11px] italic text-zinc-400 dark:text-zinc-500">Chưa phân bổ</span>
                  <button
                    type="button"
                    onClick={() => onAddBlock(dayIndex)}
                    disabled={disabled}
                    className="mt-1 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    + khung giờ
                  </button>
                </div>
              ) : (
                dayBlocks.map((block) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    onEdit={onEditBlock}
                    onDelete={onDeleteBlock}
                    disabled={disabled}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
