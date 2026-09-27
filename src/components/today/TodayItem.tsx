"use client";

import React, { useState } from "react";
import type { WeekPlanItemDto } from "@/lib/contracts";
import { useSettings } from "@/context/SettingsContext";

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
  const { locale } = useSettings();
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
          ? "border-zinc-200 bg-zinc-100/60 opacity-80 dark:border-zinc-800 dark:bg-zinc-900/40"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {/* Checkbox button */}
        <button
          type="button"
          disabled={isClosed || isMutating}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          title={
            isComplete
              ? locale === "vi"
                ? "Điểm số đo lường thành tựu đạt được, không đo ý chí (The score measures achievements)."
                : "The score measures achievements, not effort or intentions."
              : locale === "vi"
              ? "Đánh dấu hoàn thành (Mark completion)"
              : "Mark completion"
          }
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition focus:outline-hidden focus:ring-2 focus:ring-zinc-400 ${
            isComplete
              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
              : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
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
                isComplete
                  ? "text-zinc-500 line-through dark:text-zinc-400"
                  : "text-zinc-900 dark:text-zinc-100"
              }`}
            >
              {item.label}
            </span>

            {isPlanRevision && (
              <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                {locale === "vi" ? "sửa đổi kế hoạch" : "plan revision"}
              </span>
            )}
          </div>

          {/* Goal Context Chip */}
          {item.goal && (
            <div className="mt-1.5">
              <button
                type="button"
                onClick={() => setShowWhy(!showWhy)}
                className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-200 transition dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              >
                <span>{locale === "vi" ? "Mục tiêu:" : "Goal:"} {item.goal.title}</span>
                <span className="text-[9px] text-zinc-400">
                  {showWhy ? "▲" : "▼"}
                </span>
              </button>

              {showWhy && (
                <p className="mt-1 text-xs text-zinc-500 italic dark:text-zinc-400">
                  {locale === "vi" ? "Lý do:" : "Why:"} &ldquo;{item.goal.why}&rdquo;
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
              ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {item.done}/{item.plannedCount}
        </span>

        {isMulti && !isClosed && (
          <div className="flex items-center rounded-md border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
            <button
              type="button"
              disabled={isClosed || isMutating || item.done <= 0}
              onClick={() => onDecrement(item)}
              title={locale === "vi" ? "Giảm hoàn thành" : "Decrease completion"}
              className="flex h-6 w-6 items-center justify-center rounded-l text-xs font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              −
            </button>
            <button
              type="button"
              disabled={isClosed || isMutating || item.done >= item.plannedCount}
              onClick={() => onIncrement(item)}
              title={locale === "vi" ? "Tăng hoàn thành" : "Increase completion"}
              className="flex h-6 w-6 items-center justify-center rounded-r border-l border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
