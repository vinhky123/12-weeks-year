"use client";

import React, { useState } from "react";
import type { CycleDto } from "@/lib/contracts";
import { useSettings } from "@/context/SettingsContext";
import { t } from "@/lib/i18n";

interface CycleBarProps {
  cycle: CycleDto | null;
  onCreateCycle: (name: string, startDate?: string) => Promise<void>;
  onStartCycle: (id: number) => Promise<void>;
}

export default function CycleBar({
  cycle,
  onCreateCycle,
  onStartCycle,
}: CycleBarProps) {
  const { locale } = useSettings();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setCreating(true);
      setError(null);
      await onCreateCycle(name.trim(), startDate || undefined);
      setName("");
      setStartDate("");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError(locale === "vi" ? "Không thể tạo chu kỳ." : "Failed to create cycle.");
    } finally {
      setCreating(false);
    }
  };

  const handleStart = async () => {
    if (!cycle) return;
    try {
      setStarting(true);
      setError(null);
      await onStartCycle(cycle.id);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError(locale === "vi" ? "Không thể bắt đầu chu kỳ." : "Failed to start cycle.");
    } finally {
      setStarting(false);
    }
  };

  const cycleStatusLabel =
    locale === "vi"
      ? cycle?.status === "active"
        ? "Đang hoạt động"
        : cycle?.status === "planning"
        ? "Đang lập kế hoạch"
        : cycle?.status === "review"
        ? "Đang đánh giá"
        : "Đã lưu trữ"
      : cycle?.status;

  if (!cycle) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-xs space-y-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {locale === "vi" ? "Một năm là 12 tuần." : "A year is 12 weeks."}
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {locale === "vi"
              ? "Một năm là 12 tuần. Chọn 1–3 mục tiêu, thêm các hành động chiến lược hàng ngày/tuần, sau đó bắt đầu năm mới."
              : "A year is 12 weeks. Pick up to 3 goals, add the daily/weekly actions that produce them, then start the year."}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-2">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1 dark:text-zinc-300">
              {locale === "vi" ? "Tên chu kỳ" : "Cycle Name"}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={locale === "vi" ? "Ví dụ: Q4 2026 Trọng tâm" : "e.g. Q4 2026 Focus"}
              required
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              disabled={creating}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1 dark:text-zinc-300">
              {locale === "vi" ? "Ngày bắt đầu (Tùy chọn)" : "Start Date (Optional)"}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              disabled={creating}
            />
          </div>

          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="no-print rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50 transition shrink-0 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {creating
              ? (locale === "vi" ? "Đang tạo..." : "Creating...")
              : (locale === "vi" ? "Tạo chu kỳ" : "Create cycle")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      {error && (
        <div className="mb-4 rounded-md bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{cycle.name}</h2>
            <span className="rounded-md bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {cycleStatusLabel}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {locale === "vi" ? "Bắt đầu:" : "Starts:"}{" "}
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{cycle.startDate}</span> &middot;{" "}
            {locale === "vi" ? "12 tuần thực thi + tuần 13 đánh giá" : "12 weeks of execution + week 13 review"}
          </p>
        </div>

        {cycle.status === "planning" && (
          <button
            type="button"
            onClick={handleStart}
            disabled={starting}
            className="no-print rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50 transition shrink-0 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {starting
              ? (locale === "vi" ? "Đang bắt đầu..." : "Starting...")
              : t(locale, "ritual.start_cycle")}
          </button>
        )}
      </div>
    </div>
  );
}
