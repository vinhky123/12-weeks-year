"use client";

import React, { useState } from "react";
import type { GoalCreate, GoalDto } from "@/lib/contracts";
import { useSettings } from "@/context/SettingsContext";

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: GoalCreate) => Promise<void>;
  initialGoal?: GoalDto;
}

export default function GoalModal({
  isOpen,
  onClose,
  onSubmit,
  initialGoal,
}: GoalModalProps) {
  const { locale } = useSettings();
  const [title, setTitle] = useState(initialGoal?.title ?? "");
  const [why, setWhy] = useState(initialGoal?.why ?? "");
  const [lagMetricName, setLagMetricName] = useState(initialGoal?.lagMetricName ?? "");
  const [lagUnit, setLagUnit] = useState(initialGoal?.lagUnit ?? "");
  const [lagStart, setLagStart] = useState<string>(
    initialGoal?.lagStart !== undefined ? String(initialGoal.lagStart) : "0",
  );
  const [lagTarget, setLagTarget] = useState<string>(
    initialGoal?.lagTarget !== undefined ? String(initialGoal.lagTarget) : "100",
  );
  const [deadlineWeek, setDeadlineWeek] = useState<number>(
    initialGoal?.deadlineWeek ?? 12,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title =
        locale === "vi"
          ? "Goal title is required (Tiêu đề mục tiêu là bắt buộc)."
          : "Goal title is required.";
    }
    if (!why.trim()) {
      newErrors.why =
        locale === "vi"
          ? "Lý do vì sao mục tiêu này quan trọng? Mục tiêu thiếu kết nối cảm xúc sẽ không vượt qua được thung lũng."
          : "Why does this matter? Goals without an emotional connection don't survive the valley.";
    }
    if (!lagMetricName.trim()) {
      newErrors.lagMetricName =
        locale === "vi"
          ? "Hãy đặt tên cho con số kết quả — mục tiêu mơ hồ không thể tính điểm."
          : "Name the number — vague goals can't be scored.";
    }
    if (!lagUnit.trim()) {
      newErrors.lagUnit =
        locale === "vi"
          ? "Đơn vị tính là bắt buộc (ví dụ: kg, $, cuộc gọi)."
          : "Unit is required (e.g. lbs, $, calls).";
    }

    const startNum = parseFloat(lagStart);
    const targetNum = parseFloat(lagTarget);

    if (isNaN(startNum)) newErrors.lagStart = locale === "vi" ? "Giá trị ban đầu phải là số." : "Start value must be numeric.";
    if (isNaN(targetNum)) newErrors.lagTarget = locale === "vi" ? "Giá trị mục tiêu phải là số." : "Target value must be numeric.";
    if (!isNaN(startNum) && !isNaN(targetNum) && startNum === targetNum) {
      newErrors.lagTarget = locale === "vi" ? "Giá trị mục tiêu phải khác giá trị ban đầu." : "Target value must be different from start value.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setServerError(null);

    try {
      setSubmitting(true);
      await onSubmit({
        title: title.trim(),
        why: why.trim(),
        lagMetricName: lagMetricName.trim(),
        lagUnit: lagUnit.trim(),
        lagStart: startNum,
        lagTarget: targetNum,
        deadlineWeek,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError(locale === "vi" ? "Không thể lưu mục tiêu." : "Failed to save goal.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {initialGoal
              ? (locale === "vi" ? "Chỉnh sửa mục tiêu" : "Edit Goal")
              : "Add 12-Week Goal"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 text-lg dark:hover:text-zinc-200"
          >
            &times;
          </button>
        </div>

        {serverError && (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              {locale === "vi" ? "Tiêu đề mục tiêu (Goal Title)" : "Goal Title"}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={locale === "vi" ? "Ví dụ: Giảm 5kg" : "e.g. Lose 10 lbs"}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              disabled={submitting}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.title}</p>
            )}
          </div>

          {/* Why */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              {locale === "vi" ? "Lý do vì sao (Why it matters)" : "Why it matters"}
            </label>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {locale === "vi"
                ? "Vì sao mục tiêu này quan trọng? Mục tiêu không có cảm xúc sẽ không vượt qua được thung lũng."
                : "Why does this matter? Goals without an emotional connection don’t survive the valley."}
            </p>
            <textarea
              rows={2}
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder={
                locale === "vi"
                  ? "Ví dụ: Tràn đầy năng lượng và tự tin cho tầm nhìn sức khỏe 3 năm"
                  : "e.g. Energy and stamina for the 3-year health vision"
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              disabled={submitting}
            />
            {errors.why && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.why}</p>
            )}
          </div>

          {/* Lag Metric & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                {locale === "vi" ? "Tên chỉ số kết quả" : "Lag Metric Name"}
              </label>
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                {locale === "vi" ? "Đặt tên cho con số" : "Name the number"}
              </p>
              <input
                type="text"
                value={lagMetricName}
                onChange={(e) => setLagMetricName(e.target.value)}
                placeholder={locale === "vi" ? "Ví dụ: Cân nặng" : "e.g. Weight"}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                disabled={submitting}
              />
              {errors.lagMetricName && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.lagMetricName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                {locale === "vi" ? "Đơn vị tính" : "Metric Unit"}
              </label>
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                {locale === "vi" ? "Đơn vị đo lường" : "Unit of measurement"}
              </p>
              <input
                type="text"
                value={lagUnit}
                onChange={(e) => setLagUnit(e.target.value)}
                placeholder={locale === "vi" ? "Ví dụ: kg, $, khách hàng" : "e.g. lbs, $, clients"}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                disabled={submitting}
              />
              {errors.lagUnit && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.lagUnit}</p>
              )}
            </div>
          </div>

          {/* Start and Target numbers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                {locale === "vi" ? "Giá trị bắt đầu" : "Starting Value"}
              </label>
              <input
                type="number"
                step="any"
                value={lagStart}
                onChange={(e) => setLagStart(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                disabled={submitting}
              />
              {errors.lagStart && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.lagStart}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                {locale === "vi" ? "Giá trị mục tiêu" : "Target Value"}
              </label>
              <input
                type="number"
                step="any"
                value={lagTarget}
                onChange={(e) => setLagTarget(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                disabled={submitting}
              />
              {errors.lagTarget && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.lagTarget}</p>
              )}
            </div>
          </div>

          {/* Deadline week */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              {locale === "vi" ? "Hạn chót (Tuần 1–12)" : "Deadline (Week 1–12)"}
            </label>
            <select
              value={deadlineWeek}
              onChange={(e) => setDeadlineWeek(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              disabled={submitting}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  {locale === "vi"
                    ? `Tuần ${w} ${w === 12 ? "(Kết thúc chu kỳ)" : ""}`
                    : `Week ${w} ${w === 12 ? "(End of cycle)" : ""}`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 transition dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              {locale === "vi" ? "Hủy" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {submitting ? "Saving..." : initialGoal ? "Save Goal" : "Add Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
