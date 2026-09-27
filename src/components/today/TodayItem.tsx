"use client";

import { useState } from "react";
import type { WeekPlanItemDto } from "@/lib/contracts";

interface TodayItemProps {
  item: WeekPlanItemDto;
  isClosed: boolean;
  onIncrement: (item: WeekPlanItemDto) => void;
  onDecrement: (item: WeekPlanItemDto) => void;
  isMutating?: boolean;
}

export default function TodayItem({
  item,
  isClosed,
  onIncrement,
  onDecrement,
  isMutating = false,
}: TodayItemProps) {
  const [showWhy, setShowWhy] = useState(false);
  const isMulti = item.plannedCount > 1;
  const isComplete = item.done >= item.plannedCount;
  const isPlanRevision = item.tacticId === null;

  const handleToggle = () => {
    if (isClosed || isMutating) return;
    if (isComplete) {
      onDecrement(item);
    } else {
      onIncrement(item);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div
      className={`group relative flex items-start justify-between gap-3 rounded-xl border p-4 transition ${
        isComplete
          ? "border-emerald-200 bg-emerald-50/30 opacity-75"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {/* Checkbox button */}
        <button
          type="button"
          disabled={isClosed || isMutating}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          title={isComplete ? "The score measures achievements, not effort or intentions." : "Mark completion"}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition focus:outline-hidden focus:ring-2 focus:ring-slate-400 ${
            isComplete
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-300 bg-white hover:border-slate-400"
          } ${isClosed ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          {isComplete && (
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              onClick={handleToggle}
              className={`text-sm font-medium select-none cursor-pointer ${
                isComplete ? "text-slate-600 line-through" : "text-slate-900"
              }`}
            >
              {item.label}
            </span>

            {isPlanRevision && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                plan revision
              </span>
            )}
          </div>

          {/* Goal Context Chip */}
          {item.goal && (
            <div className="mt-1.5">
              <button
                type="button"
                onClick={() => setShowWhy(!showWhy)}
                className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 transition"
              >
                <span>Goal: {item.goal.title}</span>
                <span className="text-[9px] text-slate-400">
                  {showWhy ? "▲" : "▼"}
                </span>
              </button>

              {showWhy && (
                <p className="mt-1 text-xs text-slate-500 italic">
                  Why: &ldquo;{item.goal.why}&rdquo;
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Counter / stepper for multi-count items */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-bold ${
            isComplete
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {item.done}/{item.plannedCount}
        </span>

        {isMulti && !isClosed && (
          <div className="flex items-center rounded-md border border-slate-200 bg-white">
            <button
              type="button"
              disabled={isClosed || isMutating || item.done <= 0}
              onClick={() => onDecrement(item)}
              title="Decrease completion"
              className="flex h-6 w-6 items-center justify-center rounded-l text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white"
            >
              −
            </button>
            <button
              type="button"
              disabled={isClosed || isMutating || item.done >= item.plannedCount}
              onClick={() => onIncrement(item)}
              title="Increase completion"
              className="flex h-6 w-6 items-center justify-center rounded-r border-l border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
