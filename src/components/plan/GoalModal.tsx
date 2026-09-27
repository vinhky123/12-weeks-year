"use client";

import { useState } from "react";
import type { GoalCreate, GoalDto } from "@/lib/contracts";

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

    if (!title.trim()) newErrors.title = "Goal title is required.";
    if (!why.trim()) newErrors.why = "Why does this matter? Goals without an emotional connection don't survive the valley.";
    if (!lagMetricName.trim()) newErrors.lagMetricName = "Name the number — vague goals can't be scored.";
    if (!lagUnit.trim()) newErrors.lagUnit = "Unit is required (e.g. lbs, $, calls).";

    const startNum = parseFloat(lagStart);
    const targetNum = parseFloat(lagTarget);

    if (isNaN(startNum)) newErrors.lagStart = "Start value must be numeric.";
    if (isNaN(targetNum)) newErrors.lagTarget = "Target value must be numeric.";
    if (!isNaN(startNum) && !isNaN(targetNum) && startNum === targetNum) {
      newErrors.lagTarget = "Target value must be different from start value.";
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
        setServerError("Failed to save goal.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-lg font-bold text-slate-900">
            {initialGoal ? "Edit Goal" : "Add 12-Week Goal"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg"
          >
            &times;
          </button>
        </div>

        {serverError && (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Goal Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lose 10 lbs"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
              disabled={submitting}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-rose-600">{errors.title}</p>
            )}
          </div>

          {/* Why */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Why it matters
            </label>
            <p className="mt-0.5 text-xs text-slate-500">
              Why does this matter? Goals without an emotional connection don&rsquo;t survive the valley.
            </p>
            <textarea
              rows={2}
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="e.g. Energy and stamina for the 3-year health vision"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
              disabled={submitting}
            />
            {errors.why && (
              <p className="mt-1 text-xs text-rose-600">{errors.why}</p>
            )}
          </div>

          {/* Lag Metric & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Lag Metric Name
              </label>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Name the number — vague goals can&rsquo;t be scored.
              </p>
              <input
                type="text"
                value={lagMetricName}
                onChange={(e) => setLagMetricName(e.target.value)}
                placeholder="e.g. Weight"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
                disabled={submitting}
              />
              {errors.lagMetricName && (
                <p className="mt-1 text-xs text-rose-600">{errors.lagMetricName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Metric Unit
              </label>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Unit of measurement
              </p>
              <input
                type="text"
                value={lagUnit}
                onChange={(e) => setLagUnit(e.target.value)}
                placeholder="e.g. lbs, $, clients"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
                disabled={submitting}
              />
              {errors.lagUnit && (
                <p className="mt-1 text-xs text-rose-600">{errors.lagUnit}</p>
              )}
            </div>
          </div>

          {/* Start and Target numbers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Starting Value
              </label>
              <input
                type="number"
                step="any"
                value={lagStart}
                onChange={(e) => setLagStart(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
                disabled={submitting}
              />
              {errors.lagStart && (
                <p className="mt-1 text-xs text-rose-600">{errors.lagStart}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Target Value
              </label>
              <input
                type="number"
                step="any"
                value={lagTarget}
                onChange={(e) => setLagTarget(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
                disabled={submitting}
              />
              {errors.lagTarget && (
                <p className="mt-1 text-xs text-rose-600">{errors.lagTarget}</p>
              )}
            </div>
          </div>

          {/* Deadline week */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Deadline (Week 1–12)
            </label>
            <select
              value={deadlineWeek}
              onChange={(e) => setDeadlineWeek(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
              disabled={submitting}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Week {w} {w === 12 ? "(End of cycle)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
            >
              {submitting ? "Saving..." : initialGoal ? "Save Goal" : "Add Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
