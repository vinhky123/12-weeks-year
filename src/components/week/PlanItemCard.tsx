"use client";

import React, { useEffect, useRef, useState } from "react";
import type { WeekPlanItemDto } from "@/lib/contracts";
import { useSettings } from "@/context/SettingsContext";
import { occurrenceCompletionDate, occurrenceWeekEnd } from "@/lib/occurrenceUiRules";

const EN_DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const VI_DAY_NAMES = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

// A moved card remounts in another day column; this lets the new instance take focus back.
let focusMoveSelectFor: number | null = null;

interface PlanItemCardProps {
  item: WeekPlanItemDto;
  weekStart: string;
  todayDate: string;
  completionDateRequired: boolean;
  isClosed: boolean;
  mutationPending?: boolean;
  onMoveDay: (itemId: number, newDay: number) => Promise<void>;
  onRename: (itemId: number, newLabel: string) => Promise<void>;
  onRemove: (itemId: number) => Promise<void>;
  onToggleComplete: (item: WeekPlanItemDto, date?: string) => Promise<void>;
}
type Mutation = "move" | "rename" | "remove" | "complete" | null;

export default function PlanItemCard({
  item,
  weekStart,
  todayDate,
  completionDateRequired,
  isClosed,
  mutationPending = false,
  onMoveDay,
  onRename,
  onRemove,
  onToggleComplete,
}: PlanItemCardProps) {
  const { locale } = useSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(item.label);
  const [mutation, setMutation] = useState<Mutation>(null);
  const [error, setError] = useState("");
  const latestCompletionDate = occurrenceWeekEnd(weekStart) < todayDate ? occurrenceWeekEnd(weekStart) : todayDate;
  const [completionDate, setCompletionDate] = useState(() => occurrenceCompletionDate(weekStart, item.dayOfWeek, latestCompletionDate));

  const isComplete = item.done >= item.plannedCount;
  const isPlanRevision = item.tacticId === null;
  const isPending = mutation !== null;
  const cardWritePending = mutationPending || isPending;
  const dayNames = locale === "vi" ? VI_DAY_NAMES : EN_DAY_NAMES;
  const renameInputId = `rename-plan-item-${item.id}`;
  const moveSelectId = `move-plan-item-${item.id}`;

  const moveSelectRef = useRef<HTMLSelectElement>(null);
  const renameTriggerRef = useRef<HTMLButtonElement>(null);
  const mutationRef = useRef<Mutation>(null);
  const focusRenameTriggerRef = useRef(false);

  useEffect(() => {
    if (!isEditing) setDraftLabel(item.label);
  }, [isEditing, item.label]);

  useEffect(() => {
    setCompletionDate(occurrenceCompletionDate(weekStart, item.dayOfWeek, latestCompletionDate));
  }, [item.dayOfWeek, latestCompletionDate, weekStart]);

  useEffect(() => {
    if (focusMoveSelectFor === item.id) {
      focusMoveSelectFor = null;
      moveSelectRef.current?.focus();
    }
  }, [item.id]);

  useEffect(() => {
    if (!isEditing && focusRenameTriggerRef.current) {
      focusRenameTriggerRef.current = false;
      renameTriggerRef.current?.focus();
    }
  }, [isEditing]);

  const failureMessage =
    locale === "vi" ? "Không thể cập nhật công việc. Vui lòng thử lại." : "Could not update this task. Please try again.";

  const beginMutation = (nextMutation: Exclude<Mutation, null>) => {
    if (mutationPending || mutationRef.current !== null) return false;
    mutationRef.current = nextMutation;
    setMutation(nextMutation);
    return true;
  };

  const finishMutation = () => {
    mutationRef.current = null;
    setMutation(null);
  };

  const handleSaveRename = async () => {
    const nextLabel = draftLabel.trim();
    if (!nextLabel || !beginMutation("rename")) return;

    setError("");
    try {
      await onRename(item.id, nextLabel);
      focusRenameTriggerRef.current = true;
      setIsEditing(false);
    } catch {
      setError(failureMessage);
    } finally {
      finishMutation();
    }
  };

  const handleSelectDay = async (newDay: number) => {
    if (newDay === item.dayOfWeek || !beginMutation("move")) return;

    setError("");
    focusMoveSelectFor = item.id;
    try {
      await onMoveDay(item.id, newDay);
    } catch {
      focusMoveSelectFor = null;
      setError(failureMessage);
    } finally {
      finishMutation();
    }
  };

  const handleRemove = async () => {
    if (!beginMutation("remove")) return;

    setError("");
    try {
      await onRemove(item.id);
    } catch {
      setError(failureMessage);
    } finally {
      finishMutation();
    }
  };

  const handleToggleComplete = async () => {
    if (!beginMutation("complete")) return;
    setError("");
    try {
      await onToggleComplete(item, completionDateRequired ? completionDate : undefined);
    } catch {
      setError(failureMessage);
    } finally {
      finishMutation();
    }
  };

  const startRename = () => {
    if (mutationPending || mutationRef.current !== null) return;
    setError("");
    setDraftLabel(item.label);
    setIsEditing(true);
  };

  const cancelRename = () => {
    if (mutationRef.current !== null) return;
    setError("");
    setDraftLabel(item.label);
    focusRenameTriggerRef.current = true;
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
              readOnly={cardWritePending}
              aria-disabled={cardWritePending || undefined}
              className="min-h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 aria-disabled:cursor-wait aria-disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
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

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {item.done}/{item.plannedCount}
          </span>
          {!isClosed ? (
            <button
              type="button"
              onClick={() => void handleToggleComplete()}
              disabled={cardWritePending || (completionDateRequired && !completionDate)}
              aria-pressed={isComplete}
              aria-label={locale === "vi"
                ? `${isComplete ? "Đánh dấu chưa hoàn thành" : "Đánh dấu hoàn thành"}: ${item.label}`
                : `${isComplete ? "Mark incomplete" : "Mark complete"}: ${item.label}`}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 text-lg font-bold text-zinc-700 hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {isComplete ? "✓" : "○"}
            </button>
          ) : null}
        </div>
      </div>

      {item.goal ? (
        <p className="text-xs leading-5 text-zinc-600 [overflow-wrap:anywhere] dark:text-zinc-400">{item.goal.title}</p>
      ) : isPlanRevision ? (
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {locale === "vi" ? "Điều chỉnh kế hoạch" : "Plan revision"}
        </p>
      ) : null}

      {!isClosed && completionDateRequired && !isPlanRevision ? (
        <div>
          <label htmlFor={`completion-date-${item.id}`} className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
            {locale === "vi" ? "Ngày thực hiện" : "Completion date"}
          </label>
          <input
            id={`completion-date-${item.id}`}
            type="date"
            required
            min={weekStart}
            max={latestCompletionDate}
            value={completionDate}
            onChange={(event) => setCompletionDate(event.target.value)}
            disabled={cardWritePending}
            className="min-h-10 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          />
        </div>
      ) : null}

      {!isClosed ? (
        isEditing ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveRename}
              disabled={!draftLabel.trim()}
              aria-disabled={cardWritePending || undefined}
              aria-label={locale === "vi" ? "Lưu tên công việc" : "Save task name"}
              className="min-h-10 rounded-lg border border-teal-700 bg-teal-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-teal-500 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              {mutation === "rename" ? (locale === "vi" ? "Đang lưu…" : "Saving…") : locale === "vi" ? "Lưu" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancelRename}
              aria-disabled={isPending || undefined}
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
                aria-disabled={cardWritePending || undefined}
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
              ref={renameTriggerRef}
              type="button"
              onClick={startRename}
              aria-disabled={cardWritePending || undefined}
              aria-label={locale === "vi" ? `Đổi tên ${item.label}` : `Rename ${item.label}`}
              className="min-h-10 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              {locale === "vi" ? "Đổi tên" : "Rename"}
            </button>
            {isPlanRevision || !isComplete ? (
              <button
                type="button"
                onClick={() => void handleRemove()}
                aria-disabled={cardWritePending || undefined}
                aria-label={locale === "vi" ? `Xóa ${item.label}` : `Remove ${item.label}`}
                className="min-h-10 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-rose-900 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
              >
                {mutation === "remove" ? (locale === "vi" ? "Đang xóa…" : "Removing…") : locale === "vi" ? "Xóa" : "Remove"}
              </button>
            ) : null}
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
