"use client";

import React, { useState } from "react";
import type {
  WeekPlanDetailDto,
  GoalDto,
  CloseWeek,
} from "@/lib/contracts";
import ScoreVerdict from "./ScoreVerdict";
import { useSettings } from "@/context/SettingsContext";

interface CloseWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  planDetail: WeekPlanDetailDto;
  activeGoals: GoalDto[];
  currentCycleWeek: number;
  onCloseSubmit: (data: CloseWeek) => Promise<WeekPlanDetailDto>;
  onNavigateWeek: (week: number) => void;
}

export default function CloseWeekModal({
  isOpen,
  onClose,
  planDetail,
  activeGoals,
  currentCycleWeek,
  onCloseSubmit,
  onNavigateWeek,
}: CloseWeekModalProps) {
  const { locale } = useSettings();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [lagInputs, setLagInputs] = useState<Record<number, string>>({});
  const [lagErrors, setLagErrors] = useState<Record<number, string>>({});
  const [reflection, setReflection] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [closedResult, setClosedResult] = useState<WeekPlanDetailDto | null>(null);

  if (!isOpen) return null;

  const { plan, score } = planDetail;

  const handleLagChange = (goalId: number, val: string) => {
    setLagInputs((prev) => ({ ...prev, [goalId]: val }));
    if (val.trim() !== "" && isNaN(Number(val))) {
      setLagErrors((prev) => ({ ...prev, [goalId]: "Must be a valid number" }));
    } else {
      setLagErrors((prev) => {
        const next = { ...prev };
        delete next[goalId];
        return next;
      });
    }
  };

  const handleContinueFromLag = () => {
    const errors: Record<number, string> = {};
    for (const [goalIdStr, val] of Object.entries(lagInputs)) {
      if (val.trim() !== "" && isNaN(Number(val))) {
        errors[Number(goalIdStr)] = "Must be a valid number";
      }
    }

    if (Object.keys(errors).length > 0) {
      setLagErrors(errors);
      return;
    }

    setLagErrors({});
    setStep(3);
  };

  const handleFinalClose = async () => {
    try {
      setSubmitting(true);
      setServerError(null);

      const lagValues: { goalId: number; value: number }[] = [];
      for (const [goalIdStr, val] of Object.entries(lagInputs)) {
        if (val.trim() !== "" && !isNaN(Number(val))) {
          lagValues.push({
            goalId: Number(goalIdStr),
            value: Number(val),
          });
        }
      }

      const payload: CloseWeek = {
        reflection: reflection.trim() || undefined,
        lagValues: lagValues.length > 0 ? lagValues : undefined,
      };

      const result = await onCloseSubmit(payload);
      setClosedResult(result);
      setStep(4);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError(locale === "vi" ? "Không thể chốt tuần." : "Failed to close week.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const nextWeekNumber = plan.weekNumber + 1;
  const canPlanNextWeek = nextWeekNumber <= currentCycleWeek + 1 && nextWeekNumber <= 12;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150 space-y-6 dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header & Step Indicator */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {locale === "vi"
                ? `Nghi thức chốt tuần · Tuần ${plan.weekNumber}`
                : `Close Week Ritual · Week ${plan.weekNumber}`}
            </span>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {step === 1 && "Step 1: Confront the Truth"}
              {step === 2 && "Step 2: Log Lag Numbers"}
              {step === 3 && "Step 3: Reflection & Freeze"}
              {step === 4 && (locale === "vi" ? "Đã chốt tuần thành công" : "Week Closed Successfully")}
            </h3>
          </div>

          {step < 4 && (
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-2 w-2 rounded-full transition ${
                    step === s
                      ? "bg-zinc-900 dark:bg-zinc-100 w-5"
                      : step > s
                      ? "bg-zinc-400 dark:bg-zinc-600"
                      : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {serverError && (
          <div className="rounded-md bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
            {serverError}
          </div>
        )}

        {/* STEP 1: The Score */}
        {step === 1 && (
          <div className="space-y-6">
            <ScoreVerdict score={score} />

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-md bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                Continue to Lag Values &rarr;
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Lag Values */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {locale === "vi"
                ? "Ghi nhận chỉ số kết quả thực tế cho từng mục tiêu tuần này. Có thể để trống nếu không đo."
                : "Log progress on your lag measures for each goal. Leave empty to skip."}
            </p>

            <div className="space-y-3">
              {activeGoals.map((g) => (
                <div
                  key={g.id}
                  className="rounded-md border border-zinc-200 bg-zinc-50/50 p-3.5 space-y-1 dark:border-zinc-800 dark:bg-zinc-800/40"
                >
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{g.title}</span>
                    <span className="text-zinc-400 font-medium dark:text-zinc-500">
                      {locale === "vi" ? "Mục tiêu:" : "Target:"} {g.lagTarget} {g.lagUnit}
                    </span>
                  </div>
                  <label className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                    {g.lagMetricName} ({g.lagUnit}): {g.lagStart} &rarr; {g.lagTarget} &middot; {locale === "vi" ? "tuần này:" : "this week:"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder={`e.g. ${g.lagTarget}`}
                    value={lagInputs[g.id] ?? ""}
                    onChange={(e) => handleLagChange(g.id, e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  {lagErrors[g.id] && (
                    <p className="text-[11px] text-rose-600 font-medium dark:text-rose-400">
                      {lagErrors[g.id]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-md px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                &larr; {locale === "vi" ? "Quay lại điểm số" : "Back to Score"}
              </button>
              <button
                type="button"
                onClick={handleContinueFromLag}
                className="rounded-md bg-zinc-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                Continue to Reflection &rarr;
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Reflection & Freeze */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1 dark:text-zinc-300">
                {locale === "vi" ? "Một dòng suy ngẫm tuần (Tùy chọn)" : "One-Line Weekly Reflection (Optional)"}
              </label>
              <textarea
                rows={3}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder={
                  locale === "vi"
                    ? "Một dòng ngắn: điều gì hiệu quả, điều gì trục trặc, tuần tới thay đổi gì?"
                    : "One line: what worked, what slipped, what changes next week?"
                }
                className="w-full rounded-md border border-zinc-300 p-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                disabled={submitting}
              />
            </div>

            <div className="rounded-md border border-zinc-300 bg-zinc-100 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-start gap-2.5">
                <span className="text-lg">🔒</span>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wide dark:text-zinc-100">
                    {locale === "vi" ? "Cảnh báo đóng băng" : "Freeze Warning"}
                  </h4>
                  <p className="mt-0.5 text-xs text-zinc-700 font-medium leading-relaxed dark:text-zinc-300">
                    Closing freezes week {plan.weekNumber} forever — completions can no longer change.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={submitting}
                className="rounded-md px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                &larr; {locale === "vi" ? "Quay lại chỉ số" : "Back to Lag"}
              </button>
              <button
                type="button"
                onClick={handleFinalClose}
                disabled={submitting}
                className="rounded-md bg-zinc-900 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                {submitting
                  ? (locale === "vi" ? "Đang chốt..." : "Closing...")
                  : (locale === "vi" ? `Chốt Tuần ${plan.weekNumber} (Close Week ${plan.weekNumber})` : `Close Week ${plan.weekNumber}`)}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Success confirmation */}
        {step === 4 && closedResult && (
          <div className="space-y-6 text-center py-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-2xl font-bold dark:bg-zinc-800">
              🎉
            </div>

            <div>
              <h4 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                {locale === "vi" ? `Tuần ${plan.weekNumber} đã được chốt` : `Week ${plan.weekNumber} is Closed`}
              </h4>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {locale === "vi"
                  ? `Điểm số chính thức là ${closedResult.score?.scorePct ?? 0}%. Một bản sao lưu tự động đã được lưu an toàn.`
                  : `Your final score is locked at ${closedResult.score?.scorePct ?? 0}%. An automatic checkpoint was saved.`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              {canPlanNextWeek ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateWeek(nextWeekNumber);
                  }}
                  className="w-full sm:w-auto rounded-md bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  {locale === "vi" ? `Lập kế hoạch Tuần ${nextWeekNumber} →` : `Plan Week ${nextWeekNumber} →`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto rounded-md bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  {locale === "vi" ? "Đóng" : "Done"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
