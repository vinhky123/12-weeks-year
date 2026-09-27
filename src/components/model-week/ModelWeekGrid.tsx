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
              isWeekend ? "border-slate-200 bg-slate-50/60" : "border-slate-200 bg-white"
            }`}
          >
            {/* Day Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <div>
                <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  {dayAbbr}
                </span>
                <span className="ml-1 text-[11px] text-slate-400 font-medium hidden sm:inline">
                  {dayName.slice(3)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onAddBlock(dayIndex)}
                disabled={disabled}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
                title={`Add block to ${dayName}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Block List */}
            <div className="flex-1 space-y-2.5">
              {dayBlocks.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 p-2 text-center">
                  <span className="text-[11px] italic text-slate-400">Unallocated</span>
                  <button
                    type="button"
                    onClick={() => onAddBlock(dayIndex)}
                    disabled={disabled}
                    className="mt-1 text-[10px] font-semibold text-slate-600 hover:text-slate-900"
                  >
                    + block
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
