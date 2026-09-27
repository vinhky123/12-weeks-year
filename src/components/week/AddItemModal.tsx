"use client";

import React, { useState } from "react";
import { useSettings } from "@/context/SettingsContext";

const EN_DAYS = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

const VI_DAYS = [
  { value: 0, label: "Thứ Hai" },
  { value: 1, label: "Thứ Ba" },
  { value: 2, label: "Thứ Tư" },
  { value: 3, label: "Thứ Năm" },
  { value: 4, label: "Thứ Sáu" },
  { value: 5, label: "Thứ Bảy" },
  { value: 6, label: "Chủ Nhật" },
];

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (label: string, dayOfWeek: number) => Promise<void>;
}

export default function AddItemModal({
  isOpen,
  onClose,
  onAdd,
}: AddItemModalProps) {
  const { locale } = useSettings();
  const [label, setLabel] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<number>(0);
  const [showConfirmRevision, setShowConfirmRevision] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const daysOptions = locale === "vi" ? VI_DAYS : EN_DAYS;

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError(locale === "vi" ? "Tên đầu việc là bắt buộc." : "Item label is required.");
      return;
    }
    setError(null);
    setShowConfirmRevision(true);
  };

  const handleConfirmAdd = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await onAdd(label.trim(), dayOfWeek);
      setLabel("");
      setShowConfirmRevision(false);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(locale === "vi" ? "Không thể thêm đầu việc." : "Failed to add plan item.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150 dark:border-zinc-800 dark:bg-zinc-900">
        {!showConfirmRevision ? (
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {locale === "vi"
                  ? "Thêm công việc phát sinh vào tuần (Add Ad-hoc Task to Week Plan)"
                  : "Add Ad-hoc Task to Week Plan"}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-600 text-lg dark:hover:text-zinc-200"
              >
                &times;
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-md bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleInitialSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1 dark:text-zinc-300">
                  {locale === "vi" ? "Tên công việc" : "Task Label"}
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={
                    locale === "vi"
                      ? "Ví dụ: Họp khẩn giải quyết khiếu nại (Urgent client presentation)"
                      : "e.g. Urgent client presentation follow-up"
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1 dark:text-zinc-300">
                  {locale === "vi" ? "Thực hiện vào ngày" : "Placed on Day"}
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  {daysOptions.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!label.trim()}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <span className="text-xl">⚠️</span>
              <h3 className="text-base font-bold">
                {locale === "vi" ? "Xác nhận điều chỉnh kế hoạch" : "Plan Revision Confirmation"}
              </h3>
            </div>

            <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium bg-zinc-100 border border-zinc-200 rounded-md p-4 dark:bg-zinc-800 dark:border-zinc-700">
              This isn’t from your 12-Week Plan. Adding it as a plan revision keeps the weekly plan strategic. Add anyway?
            </p>

            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowConfirmRevision(false)}
                disabled={submitting}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                disabled={submitting}
                className="rounded-lg bg-zinc-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                {submitting ? (locale === "vi" ? "Đang thêm..." : "Adding...") : (locale === "vi" ? "Xác nhận thêm" : "Confirm & Add")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
