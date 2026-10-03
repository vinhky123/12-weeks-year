"use client";

import React, { useId, useState } from "react";
import type { WeekPlanItemDto } from "@/lib/contracts";
import { useSettings } from "@/context/SettingsContext";

interface TodayItemProps {
  item: WeekPlanItemDto;
  isClosed: boolean;
  onIncrement: (item: WeekPlanItemDto) => void;
  onDecrement: (item: WeekPlanItemDto) => void;
  isMutating?: boolean;
}

export default function TodayItem({ item, isClosed, onIncrement, onDecrement, isMutating = false }: TodayItemProps) {
  const { locale } = useSettings();
  const goalId = useId();
  const [showGoal, setShowGoal] = useState(false);
  const isMulti = item.plannedCount > 1;
  const isComplete = item.done >= item.plannedCount;
  const isExtraTask = item.tacticId === null;
  const controlsDisabled = isClosed || isMutating || isExtraTask;
  const completionName = isComplete
    ? locale === "vi" ? `Hủy hoàn thành: ${item.label}` : `Undo completion: ${item.label}`
    : locale === "vi" ? `Đánh dấu hoàn thành: ${item.label}` : `Mark complete: ${item.label}`;

  const handleToggle = () => {
    if (controlsDisabled) return;
    if (isComplete) onDecrement(item);
    else onIncrement(item);
  };

  return (
    <article className={`flex w-full min-w-0 max-w-full flex-col gap-3 overflow-hidden rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between ${
      isComplete
        ? "border-zinc-200 bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-900/50"
        : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
    }`}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <button
          type="button"
          aria-label={completionName}
          aria-pressed={isComplete}
          disabled={controlsDisabled}
          onClick={handleToggle}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 dark:focus:ring-teal-300 ${
            isComplete
              ? "border-teal-700 bg-teal-700 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-zinc-950"
              : "border-zinc-300 bg-white text-zinc-700 hover:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {isComplete ? <span aria-hidden="true" className="text-lg">✓</span> : <span aria-hidden="true" className="h-3 w-3 rounded-sm border border-current" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className={`min-w-0 break-all text-[15px] font-medium leading-6 ${isComplete ? "text-zinc-500 line-through dark:text-zinc-400" : "text-zinc-900 dark:text-zinc-100"}`}>{item.label}</p>
          {isExtraTask && <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{locale === "vi" ? "Việc thêm · không thể theo dõi hoàn thành" : "Extra task · completion tracking unavailable"}</p>}
          {item.goal && (
            <details open={showGoal} className="mt-2 min-w-0 max-w-full">
              <summary
                aria-controls={goalId}
                aria-expanded={showGoal}
                onClick={(event) => {
                  event.preventDefault();
                  setShowGoal((current) => !current);
                }}
                className="min-h-10 min-w-0 max-w-full cursor-pointer break-all whitespace-normal rounded-md bg-zinc-100 px-2.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {locale === "vi" ? "Mục tiêu:" : "Goal:"} {item.goal.title}
              </summary>
              <p id={goalId} className="mt-1.5 min-w-0 max-w-full break-words [overflow-wrap:anywhere] text-sm italic text-zinc-600 dark:text-zinc-400">{locale === "vi" ? "Lý do:" : "Why:"} “{item.goal.why}”</p>
            </details>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 pl-[52px] sm:pl-0">
        <span className="rounded-md bg-zinc-100 px-2.5 py-1.5 text-right text-sm font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {item.done}/{item.plannedCount}
          {isMulti && <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{locale === "vi" ? "lượt trong tuần" : "weekly count"}</span>}
        </span>
        {isMulti && (
          <>
            <div className="flex items-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
              <button type="button" aria-label={locale === "vi" ? `Giảm hoàn thành: ${item.label}` : `Decrease completion: ${item.label}`} disabled={controlsDisabled || item.done <= 0} onClick={() => onDecrement(item)} className="flex h-10 w-10 items-center justify-center rounded-l-lg text-lg font-bold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800">−</button>
              <button type="button" aria-label={locale === "vi" ? `Tăng hoàn thành: ${item.label}` : `Increase completion: ${item.label}`} disabled={controlsDisabled || item.done >= item.plannedCount} onClick={() => onIncrement(item)} className="flex h-10 w-10 items-center justify-center rounded-r-lg border-l border-zinc-200 text-lg font-bold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">+</button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
