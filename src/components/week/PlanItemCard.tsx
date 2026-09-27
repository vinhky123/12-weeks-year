"use client";

import React, { useState } from "react";
import type { WeekPlanItemDto } from "@/lib/contracts";
import { useSettings } from "@/context/SettingsContext";

const EN_DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VI_DAY_NAMES_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

interface PlanItemCardProps {
  item: WeekPlanItemDto;
  isClosed: boolean;
  onMoveDay: (itemId: number, newDay: number) => Promise<void>;
  onRename: (itemId: number, newLabel: string) => Promise<void>;
  onRemove: (itemId: number) => Promise<void>;
}

export default function PlanItemCard({
  item,
  isClosed,
  onMoveDay,
  onRename,
  onRemove,
}: PlanItemCardProps) {
  const { locale } = useSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [isMoving, setIsMoving] = useState(false);

  const isComplete = item.done >= item.plannedCount;
  const isPlanRevision = item.tacticId === null;
  const daysShort = locale === "vi" ? VI_DAY_NAMES_SHORT : EN_DAY_NAMES_SHORT;

  const handleSaveRename = async () => {
    if (!label.trim()) return;
    await onRename(item.id, label.trim());
    setIsEditing(false);
  };

  const handleSelectDay = async (newDay: number) => {
    setIsMoving(false);
    if (newDay === item.dayOfWeek) return;
    await onMoveDay(item.id, newDay);
  };

  return (
    <div
      className={`rounded-xl border p-3 shadow-2xs transition space-y-2 ${
        isComplete
          ? "border-zinc-200 bg-zinc-100/60 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400"
          : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {isEditing ? (
          <div className="flex items-center gap-1.5 w-full">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="flex-1 rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveRename}
              className="rounded bg-zinc-900 px-2 py-1 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {locale === "vi" ? "Lưu" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {locale === "vi" ? "Hủy" : "Cancel"}
            </button>
          </div>
        ) : (
          <span
            className={`text-xs font-semibold leading-snug break-words ${
              isComplete ? "text-zinc-400 line-through dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100"
            }`}
          >
            {item.label}
          </span>
        )}

        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
            isComplete
              ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {item.done}/{item.plannedCount}
        </span>
      </div>

      <div className="flex items-center justify-between gap-1 text-[11px] text-zinc-500 flex-wrap dark:text-zinc-400">
        {item.goal ? (
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 truncate max-w-[140px] dark:bg-zinc-800 dark:text-zinc-400">
            {item.goal.title}
          </span>
        ) : isPlanRevision ? (
          <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
            {locale === "vi" ? "điều chỉnh kế hoạch" : "plan revision"}
          </span>
        ) : null}

        {!isClosed && !isEditing && (
          <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
            {/* Move Day Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMoving(!isMoving)}
                className="hover:text-zinc-700 dark:hover:text-zinc-200 text-[10px] font-semibold transition"
                title={locale === "vi" ? "Chuyển sang ngày khác" : "Move to another day"}
              >
                {locale === "vi" ? "Chuyển ▼" : "Move ▼"}
              </button>

              {isMoving && (
                <div className="absolute right-0 top-full mt-1 z-30 w-28 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                  <div className="text-[10px] font-bold text-zinc-400 px-2 py-1 uppercase dark:text-zinc-500">
                    {locale === "vi" ? "Chuyển tới" : "Move to"}
                  </div>
                  {daysShort.map((day, dIdx) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectDay(dIdx)}
                      className={`w-full rounded px-2 py-1 text-left text-xs transition ${
                        dIdx === item.dayOfWeek
                          ? "bg-zinc-100 font-bold text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                          : "hover:bg-zinc-50 text-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700/50"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="hover:text-zinc-700 dark:hover:text-zinc-200 text-[10px] transition"
              title="Rename item"
            >
              {locale === "vi" ? "Đổi tên" : "Rename"}
            </button>

            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="hover:text-rose-600 text-[10px] transition dark:hover:text-rose-400"
              title="Remove item"
            >
              &times;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
