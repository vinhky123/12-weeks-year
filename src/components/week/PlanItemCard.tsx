"use client";

import React, { useEffect, useRef, useState } from "react";
import type { WeekPlanItemDto } from "@/lib/contracts";
import { useSettings } from "@/context/SettingsContext";

const EN_DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const VI_DAY_NAMES = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

// A moved card remounts in another day column; this lets the new instance take focus back.
let focusMoveSelectFor: number | null = null;

interface PlanItemCardProps {
  item: WeekPlanItemDto;
  isClosed: boolean;
  onMoveDay: (itemId: number, newDay: number) => Promise<void>;
  onRename: (itemId: number, newLabel: string) => Promise<void>;
  onRemove: (itemId: number) => Promise<void>;
}
type Mutation = "move" | "rename" | "remove" | null;

export default function PlanItemCard({
  item,
  isClosed,
  onMoveDay,
  onRename,
  onRemove,
}: PlanItemCardProps) {
  const { locale } = useSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(item.label);
  const [mutation, setMutation] = useState<Mutation>(null);
  const [error, setError] = useState("");

  const isComplete = item.done >= item.plannedCount;
  const isPlanRevision = item.tacticId === null;
  const isPending = mutation !== null;
  const dayNames = locale === "vi" ? VI_DAY_NAMES : EN_DAY_NAMES;
  const renameInputId = `rename-plan-item-${item.id}`;
  const moveSelectId = `move-plan-item-${item.id}`;

  const moveSelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!isEditing) setDraftLabel(item.label);
  }, [isEditing, item.label]);

  useEffect(() => {
    if (focusMoveSelectFor === item.id) {
      focusMoveSelectFor = null;
      moveSelectRef.current?.focus();
    }
  }, [item.id]);

  const failureMessage =
    locale === "vi" ? "Không thể cập nhật công việc. Vui lòng thử lại." : "Could not update this task. Please try again.";

  const handleSaveRename = async () => {
    const nextLabel = draftLabel.trim();
    if (!nextLabel || isPending) return;

    setError("");
    setMutation("rename");
    try {
      await onRename(item.id, nextLabel);
      setIsEditing(false);
    } catch {
      setError(failureMessage);
    } finally {
      setMutation(null);
    }
  };

  const handleSelectDay = async (newDay: number) => {
    if (newDay === item.dayOfWeek || isPending) return;

    setError("");
    setMutation("move");
    focusMoveSelectFor = item.id;
    try {
      await onMoveDay(item.id, newDay);
    } catch {
      focusMoveSelectFor = null;
      setError(failureMessage);
    } finally {
      setMutation(null);
    }
  };

  const handleRemove = async () => {
    if (isPending) return;

    setError("");
    setMutation("remove");
    try {
      await onRemove(item.id);
    } catch {
      setError(failureMessage);
    } finally {
      setMutation(null);
    }
  };

  const startRename = () => {
    setError("");
    setDraftLabel(item.label);
    setIsEditing(true);
  };

  const cancelRename = () => {
    setError("");
    setDraftLabel(item.label);
    setIsEditing(false);
  };

  return (
    <article
      className={`min-w-0 space-y-3 rounded-xl border p-3 shadow-2xs transition-colors ${
        isComplete
          ? "border-zinc-200 bg-zinc-100/70 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-400"
          : "border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      }`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        {isEditing ? (
          <div className="min-w-0 flex-1">
            <label htmlFor={renameInputId} className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
              {locale === "vi" ? "Tên công việc" : "Task name"}
            </label>
            <input
              id={renameInputId}
              type="text"
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              disabled={isPending}
              className="min-h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:cursor-wait disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              autoFocus
            />
          </div>
        ) : (
          <p
            className={`min-w-0 flex-1 text-sm font-semibold leading-5 [overflow-wrap:anywhere] ${
              isComplete ? "text-zinc-500 line-through dark:text-zinc-400" : "text-zinc-900 dark:text-zinc-100"
            }`}
          >
            {item.label}
          </p>
        )}

        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {item.done}/{item.plannedCount}
        </span>
      </div>

      {item.goal ? (
        <p className="text-xs leading-5 text-zinc-600 [overflow-wrap:anywhere] dark:text-zinc-400">{item.goal.title}</p>
      ) : isPlanRevision ? (
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {locale === "vi" ? "Điều chỉnh kế hoạch" : "Plan revision"}
        </p>
      ) : null}

      {!isClosed ? (
        isEditing ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveRename}
              disabled={isPending || !draftLabel.trim()}
              aria-label={locale === "vi" ? "Lưu tên công việc" : "Save task name"}
              className="min-h-10 rounded-lg border border-teal-700 bg-teal-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-teal-500 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              {mutation === "rename" ? (locale === "vi" ? "Đang lưu…" : "Saving…") : locale === "vi" ? "Lưu" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancelRename}
              disabled={isPending}
              aria-label={locale === "vi" ? "Hủy đổi tên" : "Cancel rename"}
              className="min-h-10 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {locale === "vi" ? "Hủy" : "Cancel"}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[11rem] flex-1">
              <label htmlFor={moveSelectId} className="sr-only">
                {locale === "vi" ? `Chuyển ${item.label}` : `Move ${item.label}`}
              </label>
              <select
                ref={moveSelectRef}
                id={moveSelectId}
                value={item.dayOfWeek}
                onChange={(event) => void handleSelectDay(Number(event.target.value))}
                aria-disabled={isPending || undefined}
                className="min-h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 aria-disabled:cursor-wait aria-disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              >
                {dayNames.map((day, dayIndex) => (
                  <option key={day} value={dayIndex}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={startRename}
              disabled={isPending}
              aria-label={locale === "vi" ? `Đổi tên ${item.label}` : `Rename ${item.label}`}
              className="min-h-10 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              {locale === "vi" ? "Đổi tên" : "Rename"}
            </button>
            <button
              type="button"
              onClick={() => void handleRemove()}
              disabled={isPending}
              aria-label={locale === "vi" ? `Xóa ${item.label}` : `Remove ${item.label}`}
              className="min-h-10 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-rose-900 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
            >
              {mutation === "remove" ? (locale === "vi" ? "Đang xóa…" : "Removing…") : locale === "vi" ? "Xóa" : "Remove"}
            </button>
          </div>
        )
      ) : null}

      {error ? (
        <p role="alert" className="text-sm leading-5 text-rose-700 dark:text-rose-300">
          {error}
        </p>
      ) : null}
    </article>
  );
}
