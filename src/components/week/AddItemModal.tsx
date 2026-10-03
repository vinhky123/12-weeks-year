"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import ModalDialog from "@/components/common/ModalDialog";
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
  const labelId = useId();
  const dayId = useId();
  const wasOpenRef = useRef(false);
  const [label, setLabel] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<number>(0);
  const [showConfirmRevision, setShowConfirmRevision] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setLabel("");
      setDayOfWeek(0);
      setShowConfirmRevision(false);
      setSubmitting(false);
      setError(null);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const close = () => {
    if (!submitting) onClose();
  };

  const daysOptions = locale === "vi" ? VI_DAYS : EN_DAYS;

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError(locale === "vi" ? "Vui lòng nhập tên công việc." : "Enter a task name.");
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
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : locale === "vi"
            ? "Không thể thêm công việc. Vui lòng thử lại."
            : "Could not add the task. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalDialog
      open={isOpen}
      onClose={close}
      title={locale === "vi" ? "Thêm công việc" : "Add task"}
      busy={submitting}
      className="max-w-md"
    >
        {!showConfirmRevision ? (
          <div>
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {locale === "vi"
                ? "Thêm một công việc phát sinh vào ngày bạn dự định thực hiện."
                : "Add an extra task to the day when you plan to do it."}
            </p>

            {error && (
              <div role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleInitialSubmit} className="mt-5 space-y-5">
              <div className="space-y-2">
                <label htmlFor={labelId} className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {locale === "vi" ? "Tên công việc" : "Task name"}
                </label>
                <input
                  id={labelId}
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={
                    locale === "vi"
                      ? "Ví dụ: Gọi lại cho khách hàng"
                      : "For example: Follow up with the customer"
                  }
                  className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-teal-400 dark:focus:ring-teal-400/20"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label htmlFor={dayId} className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {locale === "vi" ? "Ngày" : "Day"}
                </label>
                <select
                  id={dayId}
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-teal-400 dark:focus:ring-teal-400/20"
                >
                  {daysOptions.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 pt-4 sm:flex-row sm:justify-end dark:border-zinc-700">
                <button
                  type="button"
                  onClick={close}
                  className="min-h-10 rounded-lg px-4 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {locale === "vi" ? "Hủy" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={!label.trim()}
                  className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:text-zinc-950 dark:hover:bg-teal-400"
                >
                  {locale === "vi" ? "Tiếp tục" : "Continue"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {locale === "vi" ? "Xác nhận điều chỉnh kế hoạch" : "Confirm plan revision"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {locale === "vi"
                  ? "Đây là công việc phát sinh, không nằm trong các nghĩa vụ chiến thuật dùng để tính điểm tuần. Bạn vẫn muốn thêm chứ?"
                  : "This is an extra task. It is not included in the tactic obligations used to score the week. Add it anyway?"}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800/70">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">{label.trim()}</p>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                {daysOptions.find((day) => day.value === dayOfWeek)?.label}
              </p>
            </div>

            {error && (
              <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 pt-4 sm:flex-row sm:justify-end dark:border-zinc-700">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setShowConfirmRevision(false);
                }}
                disabled={submitting}
                className="min-h-10 rounded-lg px-4 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {locale === "vi" ? "Quay lại" : "Back"}
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                disabled={submitting}
                className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:text-zinc-950 dark:hover:bg-teal-400"
              >
                {submitting
                  ? locale === "vi" ? "Đang thêm…" : "Adding…"
                  : locale === "vi" ? "Xác nhận thêm" : "Confirm & add"}
              </button>
            </div>
          </div>
        )}
    </ModalDialog>
  );
}
