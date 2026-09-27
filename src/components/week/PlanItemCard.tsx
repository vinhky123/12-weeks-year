"use client";

import { useState } from "react";
import type { WeekPlanItemDto } from "@/lib/contracts";

const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [isMoving, setIsMoving] = useState(false);

  const isComplete = item.done >= item.plannedCount;
  const isPlanRevision = item.tacticId === null;

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
          ? "border-emerald-200 bg-emerald-50/40 text-slate-700"
          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {isEditing ? (
          <div className="flex items-center gap-1.5 w-full">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-900"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveRename}
              className="rounded bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600"
            >
              Cancel
            </button>
          </div>
        ) : (
          <span
            className={`text-xs font-semibold leading-snug break-words ${
              isComplete ? "text-slate-600 line-through" : "text-slate-900"
            }`}
          >
            {item.label}
          </span>
        )}

        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
            isComplete
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {item.done}/{item.plannedCount}
        </span>
      </div>

      <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500 flex-wrap">
        {item.goal ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 truncate max-w-[140px]">
            {item.goal.title}
          </span>
        ) : isPlanRevision ? (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
            plan revision
          </span>
        ) : null}

        {!isClosed && !isEditing && (
          <div className="flex items-center gap-2 text-slate-400">
            {/* Move Day Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMoving(!isMoving)}
                className="hover:text-slate-700 text-[10px] font-semibold transition"
                title="Move to another day"
              >
                Move ▼
              </button>

              {isMoving && (
                <div className="absolute right-0 top-full mt-1 z-30 w-28 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                  <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase">
                    Move to
                  </div>
                  {DAY_NAMES_SHORT.map((day, dIdx) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectDay(dIdx)}
                      className={`w-full rounded px-2 py-1 text-left text-xs transition ${
                        dIdx === item.dayOfWeek
                          ? "bg-slate-100 font-bold text-slate-900"
                          : "hover:bg-slate-50 text-slate-600"
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
              className="hover:text-slate-700 text-[10px] transition"
              title="Rename item"
            >
              Rename
            </button>

            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="hover:text-rose-600 text-[10px] transition"
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
